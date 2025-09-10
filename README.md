# SmartBuy

## Backend Setup
From the project root:
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

## Frontend Setup
cd smartbuy-frontend
npm install
npm run dev -- --host
## Once started, the app will be available at:
Local: http://localhost:5173/
Network: http://192.168.1.190:5173/