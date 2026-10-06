// node --test (npm test). Checks the browser engine against the pipeline's reference
// scores in public/phones.json, and the behaviour the site relies on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyse, bestBuys, chooseVariant, picks, sweetSpotPicks, NEAR } from './engine.js';
import { normalizeData } from './data.js';
import { keepUnsure, quizToView, quizWeights, DEFAULT_ANSWERS } from './quiz.js';

const data = normalizeData(JSON.parse(readFileSync(new URL('../../public/phones.json', import.meta.url), 'utf8')));
const balanced = data.presets.balanced.weights;

test('reproduces the pipeline reference scores and ladder for every preset', () => {
  for (const [key, preset] of Object.entries(data.presets)) {
    const an = analyse(data, { weights: preset.weights, storage: 0 });
    for (const p of data.phones) {
      const ref = p.scores[key];
      const row = an.byId.get(p.id);
      assert.ok(Math.abs(row.spec - ref.spec) < 1e-4, `${key} ${p.id} spec ${row.spec} vs ${ref.spec}`);
      assert.ok(Math.abs(row.expected - ref.expected) < 1e-3, `${key} ${p.id} expected`);
      assert.equal(row.ladder, ref.best_buy, `${key} ${p.id} best buy`);
    }
  }
});

test('the ladder: nothing cheaper outscores a rung, exact twins both stay', () => {
  const prices = [200, 300, 300, 450, 500, 900, 900];
  const specs = [4.0, 5.0, 4.5, 4.9, 6.0, 6.0, 7.0];
  assert.deepEqual([...bestBuys(prices, specs)].sort(), [0, 1, 4, 6]);
  assert.deepEqual([...bestBuys([300, 300], [5, 5])].sort(), [0, 1]);
});

test('each phone is priced at its cheapest variant meeting the storage need', () => {
  const vs = [
    { storage_gb: 128, ram_gb: 8, sgd: 450, typical_sgd: 450 },
    { storage_gb: 256, ram_gb: 8, sgd: 430, typical_sgd: 430 },
    { storage_gb: 512, ram_gb: 12, sgd: 600, typical_sgd: 600 },
  ];
  assert.equal(chooseVariant(vs, 0).storage_gb, 256); // the bigger one is on sale for less
  assert.equal(chooseVariant(vs, 512).storage_gb, 512);
  assert.equal(chooseVariant(vs, 1024), null);

  const an = analyse(data, { weights: balanced, storage: 256 });
  for (const r of an.rows) {
    const options = r.phone.variants.filter((v) => v.storage_gb >= 256);
    if (!r.fits) {
      assert.equal(options.length, 0, r.id);
      continue;
    }
    assert.ok(r.variant.storage_gb >= 256, r.id);
    assert.ok(
      options.every((v) => (v.typical_sgd ?? v.sgd) >= r.price),
      r.id,
    );
    assert.equal(r.cats.memory, r.variant.memory);
  }
  assert.ok(
    an.rows.some((r) => r.fits && r.variant.est_from),
    'some 256GB prices are estimates',
  );
});

test('the ladder only counts the phones being considered', () => {
  const all = analyse(data, { weights: balanced, storage: 128 });
  const brand = 'Samsung';
  const one = analyse(data, { weights: balanced, storage: 128, brands: [brand] });
  const considered = one.rows.filter((r) => r.considered);
  assert.ok(considered.length > 0 && considered.every((r) => r.phone.brand === brand));
  // The best Samsung is a best buy among Samsungs even if another brand beats it overall
  const top = considered.reduce((b, r) => (r.spec > b.spec ? r : b));
  assert.ok(top.ladder);
  assert.ok(all.byId.get(top.id).spec === top.spec);
  // Every phone off the ladder names the rung that beats it, which costs no more
  for (const r of considered.filter((x) => !x.ladder)) {
    assert.ok(r.beatenBy && r.beatenBy.price <= r.price && r.beatenBy.spec > r.spec, r.id);
  }
});

test('best-buy odds are stable between runs and agree with the ladder', () => {
  const a = analyse(data, { weights: balanced, storage: 128 });
  const b = analyse(data, { weights: balanced, storage: 128 });
  const rungs = a.rows.filter((r) => r.ladder);
  assert.deepEqual(
    a.rows.map((r) => r.prob),
    b.rows.map((r) => r.prob),
  );
  assert.ok(rungs.length >= 5);
  const meanOn = rungs.reduce((s, r) => s + r.prob, 0) / rungs.length;
  const off = a.rows.filter((r) => r.considered && !r.ladder);
  const meanOff = off.reduce((s, r) => s + r.prob, 0) / off.length;
  assert.ok(meanOn > 0.5 && meanOff < 0.25, `${meanOn} ${meanOff}`);
  assert.ok(rungs.every((r) => r.status !== 'beaten'));
});

test('picks: best within budget, then cheaper, stretch or other-brand alternatives', () => {
  const an = analyse(data, { weights: balanced, storage: 128 });
  for (const max of [null, 400, 800, 1200]) {
    const ps = picks(an, max);
    const within = an.rows.filter((r) => r.considered && (!max || r.now <= max));
    const top = ps[0].row;
    assert.equal(ps[0].kind, 'top');
    assert.ok(ps.length >= 1 && ps.length <= 3, `${max}`);
    assert.ok(within.every((r) => r.spec <= top.spec + 1e-9));
    assert.equal(new Set(ps.map((p) => p.row.id)).size, ps.length);
    for (const { kind, row } of ps.slice(1)) {
      if (kind === 'save') assert.ok(row.now < top.now && row.spec >= top.spec - NEAR);
      else if (kind === 'step') assert.ok(row.now < top.now && row.ladder && row.spec >= top.spec - 1);
      else if (kind === 'stretch') assert.ok(row.now > max && row.now <= max * 1.2 && row.spec >= top.spec + NEAR);
      else {
        assert.equal(kind, 'brand');
        assert.ok(row.phone.brand !== top.phone.brand && row.now <= top.now && row.spec >= top.spec - 1);
      }
    }
  }
  assert.deepEqual(picks(an, 1), []);
});

test('the quiz turns answers into priorities and filters', () => {
  const cam = quizWeights({ ...DEFAULT_ANSWERS, focus: ['camera'] }, balanced);
  const share = (w, k) => w[k] / Object.values(w).reduce((s, x) => s + x, 0);
  assert.ok(share(cam, 'camera') > 1.8 * share(balanced, 'camera'));
  const long = quizWeights({ ...DEFAULT_ANSWERS, keep: 'long' }, balanced);
  assert.ok(share(long, 'software') > share(balanced, 'software'));

  const view = quizToView(
    { ...DEFAULT_ANSWERS, os: 'ios', budget: 1500, storage: 256, must: ['esim'] },
    { baseWeights: balanced, categories: data.categories, brands: data.brands },
  );
  assert.deepEqual(view.brands, ['Apple']);
  assert.equal(view.max, 1500);
  assert.equal(view.storage, 256);
  assert.equal(view.w.length, data.categories.length);
  const android = quizToView(
    { ...DEFAULT_ANSWERS, os: 'android' },
    { baseWeights: balanced, categories: data.categories, brands: data.brands },
  );
  assert.ok(!android.brands.includes('Apple') && android.brands.length === data.brands.length - 1);
});

test('no budget in mind: a sweet spot within a point of the best, then less or the best', () => {
  for (const opts of [{}, { brands: ['Apple'] }, { size: 'compact' }]) {
    const an = analyse(data, { weights: balanced, storage: 128, ...opts });
    const pool = an.rows.filter((r) => r.considered);
    const ps = sweetSpotPicks(an);
    const kind = (k) => ps.find((p) => p.kind === k)?.row;
    const sweet = kind('sweet');
    const best = pool.reduce((b, r) => (r.spec > b.spec ? r : b));
    assert.equal(ps[0].kind, 'sweet');
    assert.ok(sweet.spec >= best.spec - 1.05, JSON.stringify(opts));
    assert.ok(pool.every((r) => r.now >= sweet.now || r.spec < best.spec - 1.05)); // nothing cheaper qualifies
    if (kind('less')) {
      assert.ok(kind('less').now <= (sweet.now * 2) / 3);
      assert.ok(pool.every((r) => r.now > (sweet.now * 2) / 3 || r.spec <= kind('less').spec + 1e-9));
    }
    assert.equal(kind('best')?.spec ?? sweet.spec, best.spec);
  }
});

test('"not sure" answers become defaults, and are forgotten once changed by hand', () => {
  const ctx = { baseWeights: balanced, categories: data.categories, brands: data.brands };
  const view = quizToView(
    { ...DEFAULT_ANSWERS, budget: 'unsure', storage: 'unsure', keep: 'unsure', focus: ['unsure'] },
    ctx,
  );
  assert.equal(view.max, null);
  assert.equal(view.storage, 128);
  assert.deepEqual(view.unsure, ['budget', 'storage', 'keep', 'focus']);
  assert.deepEqual(view.w, quizToView({ ...DEFAULT_ANSWERS, budget: null }, ctx).w); // same as a balanced 3-4 years
  assert.deepEqual(keepUnsure(view.unsure, { max: 800 }), ['storage', 'keep', 'focus']);
  assert.deepEqual(keepUnsure(view.unsure, { preset: 'camera' }), ['budget', 'storage']);
  assert.deepEqual(keepUnsure(view.unsure, { phone: 'x' }), view.unsure);
  assert.deepEqual(keepUnsure(view.unsure, { unsure: [] }), []);
});
