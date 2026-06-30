import pandas as pd


def load_and_merge(file_a: str, file_b: str) -> pd.DataFrame:
    A = pd.read_csv(file_a)
    B = pd.read_csv(file_b)
    df = pd.concat([A, B], ignore_index=True)
    return df


def drop_unwanted_columns(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(columns=['SPL', 'Ev', 'DAY', 'TIME', 'Unnamed: 0'], errors='ignore')


def convert_month_to_number(df: pd.DataFrame) -> pd.DataFrame:
    month_map = {
        "January":1, "February":2, "March":3, "April":4, "May":5, "June":6,
        "July":7, "August":8, "September":9, "October":10,
        "November":11, "December":12
    }

    df["MONTH_NUM"] = df["MONTH"].map(month_map)
    df = df.drop(columns=["MONTH"], errors="ignore")
    return df


def select_and_convert_features(df: pd.DataFrame) -> pd.DataFrame:
    feature_cols = ['OCCUPANCY', 'WINDOW', 'IAQ', 'CO2', 'RH', 'Tin', 'MONTH_NUM']
    df = df[feature_cols].copy()

    for c in feature_cols:
        df[c] = pd.to_numeric(df[c], errors='coerce')

    return df


def clean_pipeline(file_a: str, file_b: str) -> pd.DataFrame:
    df = load_and_merge(file_a, file_b)
    df = drop_unwanted_columns(df)
    df = convert_month_to_number(df)
    df = select_and_convert_features(df)
    return df/
