# SmartBuy

## Backend Setup
From the project root:
```bash
# Create and activate a virtual env
python -m venv venv
venv\Scripts\activate
# Install Dependencies
pip install -r requirements.txt
python manage.py runserver

## Frontend Setup
cd smartbuy-frontend
npm install
npm run dev -- --host
## Once started, the app will be available at:
Local: http://localhost:5173/
Network: http://192.168.1.190:5173/

