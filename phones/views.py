from decimal import Decimal, InvalidOperation
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Phone
from .serializers import PhoneSerializer
from .scoring import calculate_smartbuy_score 


class RecommendationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Determine scoring mode
        mode = (request.query_params.get("mode", "budget") or "budget").lower()
        scoring_mode = "mid" if mode == "midrange" else mode

        qs = Phone.objects.all()

        # Apply query parameter filters
        try:
            if (v := request.query_params.get("max_price")):
                qs = qs.filter(price_sgd__lte=Decimal(v))
        except (ValueError, InvalidOperation):
            return Response({"detail": "Invalid filter input."}, status=status.HTTP_400_BAD_REQUEST)

        if (v := request.query_params.get("brand")):
            qs = qs.filter(brand__iexact=v)

        # Compute raw and SmartBuy scores
        results = []
        for phone in qs:
            smartbuy, raw, breakdown = calculate_smartbuy_score(phone, mode=scoring_mode)
            data = PhoneSerializer(phone).data
            data["smartbuy_score"] = float(smartbuy)
            data["raw_score"] = float(raw)
            data["score_breakdown"] = breakdown
            data["_id"] = data.get("slug") or str(data.get("id"))  # stable identifier
            results.append(data)

        if not results:
            return Response([])

        # Continuous normalizers
        raw_vals = [p["raw_score"] for p in results]
        val_vals = [p["smartbuy_score"] for p in results]
        raw_min, raw_max = min(raw_vals), max(raw_vals)
        val_min, val_max = min(val_vals), max(val_vals)

        def _norm(x, lo, hi):
            return 0.5 if hi <= lo else (x - lo) / (hi - lo)

        # Rank-based normalizers
        ranked_by_raw = sorted(results, key=lambda x: x["raw_score"], reverse=True)
        ranked_by_val = sorted(results, key=lambda x: x["smartbuy_score"], reverse=True)
        raw_ranks = {p["_id"]: i for i, p in enumerate(ranked_by_raw)}
        val_ranks = {p["_id"]: i for i, p in enumerate(ranked_by_val)}
        max_rank = len(results) - 1 or 1

        # Final blended scoring
        for p in results:
            raw_norm_c = _norm(p["raw_score"], raw_min, raw_max)
            val_norm_c = _norm(p["smartbuy_score"], val_min, val_max)
            raw_norm_r = 1 - (raw_ranks[p["_id"]] / max_rank)
            val_norm_r = 1 - (val_ranks[p["_id"]] / max_rank)

            # Blend continuous + rank-based
            raw_norm = 0.7 * raw_norm_c + 0.3 * raw_norm_r
            val_norm = 0.7 * val_norm_c + 0.3 * val_norm_r

            # Guardrails adjust value normalization
            if p["raw_score"] < 6.0:
                val_norm *= 0.85
            elif p["raw_score"] >= 7.5:
                val_norm *= 1.05

            # Mode-specific weighting of raw vs value
            if mode == "budget":
                score = 0.30 * raw_norm + 0.70 * val_norm
            elif mode == "midrange":
                score = 0.50 * raw_norm + 0.50 * val_norm
            elif mode == "flagship":
                score = 0.90 * raw_norm + 0.10 * val_norm
            else:
                score = 0.30 * raw_norm + 0.70 * val_norm

            # Safe price parsing for tiebreakers
            try:
                price_val = float(p.get("price_sgd", float("inf")))
            except (TypeError, ValueError):
                price_val = float("inf")

            p["_raw_norm"] = round(raw_norm, 6)
            p["_val_norm"] = round(val_norm, 6)
            p["_price"] = price_val
            p["score"] = round(score, 6)

        # Sort with deterministic tiebreakers
        results.sort(
            key=lambda x: (x["score"], x["_raw_norm"], x["_val_norm"], -x["_price"]),
            reverse=True,
        )

        # Cleanup temporary fields
        for p in results:
            p.pop("_raw_norm", None)
            p.pop("_val_norm", None)
            p.pop("_price", None)
            p.pop("_id", None)

        return Response(results)
