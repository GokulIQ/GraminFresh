from app.database import engine, Base
import app.models  

def init_tables():
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    print("Tables initialized successfully!")

if __name__ == "__main__":
    init_tables()
