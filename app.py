from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel,Field,computed_field
from typing import List, Optional,Literal
import pickle
import pandas as pd
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
model = joblib.load(BASE_DIR / "model.pkl")
app=FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)
class InputData(BaseModel):
		school: Literal["GP", "MS"]
		sex: Literal["F", "M"]
		age: int= Field(ge=15, le=22)
		address: Literal["U", "R"]
		famsize: Literal["GT3", "LE3"]
		Pstatus: Literal["T", "A"]
		Medu: int= Field(ge=0, le=4)
		Fedu: int= Field(ge=0, le=4)
		Mjob: Literal["at_home", "health", "other", "services", "teacher"]
		Fjob: Literal["at_home", "health", "other", "services", "teacher"]
		reason: Literal["course", "home", "reputation", "other"]
		guardian: Literal["mother", "father", "other"]
		traveltime: int
		studytime: int=Field(ge=1, le=4)
		failures: int=Field(ge=0, le=3)
		schoolsup: Literal["yes", "no"]
		famsup: Literal["yes", "no"]
		paid: Literal["yes", "no"]
		activities: Literal["yes", "no"]
		nursery: Literal["yes", "no"]
		higher: Literal["yes", "no"]
		internet: Literal["yes", "no"]
		romantic: Literal["yes", "no"]
		famrel: int
		freetime: int
		goout: int
		Dalc: int
		Walc: int
		health: int
		absences: int= Field(ge=0)

@app.post('/predict')
def predict(data: InputData):
    input_df = pd.DataFrame([data.model_dump()])
    prediction = model.predict(input_df)
    return {"prediction": float(prediction[0])}

