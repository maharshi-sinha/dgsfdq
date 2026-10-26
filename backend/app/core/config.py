from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://windview:windview@localhost:5432/windview"
    elexon_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    cors_origins: str = "http://localhost:3000"
    gate_closure_hour: int = 9

    model_config = {"env_file": ".env"}


settings = Settings()
