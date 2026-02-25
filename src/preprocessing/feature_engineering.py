import numpy as np
import pandas as pd


def add_interaction_features(df: pd.DataFrame) -> pd.DataFrame:
    df["CO2_x_OCCUPANCY"] = df["CO2"] * df["OCCUPANCY"]
    df["CO2_x_WINDOW"] = df["CO2"] * df["WINDOW"]
    df["WINDOW_x_OCCUPANCY"] = df["WINDOW"] * df["OCCUPANCY"]
    df["Temp_x_RH"] = df["Tin"] * df["RH"]
    return df


def add_air_quality_label(df: pd.DataFrame) -> pd.DataFrame:
    df["Air_Quality_Label"] = np.select(
        [
            df["IAQ"] <= 100,
            (df["IAQ"] > 100) & (df["IAQ"] <= 200),
            df["IAQ"] > 200
        ],
        ["Good", "Moderate", "Poor"],
        default="Unknown"
    )
    return df


def feature_engineering_pipeline(df: pd.DataFrame) -> pd.DataFrame:
    df = add_interaction_features(df)
    df = add_air_quality_label(df)
    return df
