"""create wind_actuals wind_forecasts sync_log tables

Revision ID: 0001
Revises: 
Create Date: 2026-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'wind_actuals',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('settlement_date', sa.Date(), nullable=False),
        sa.Column('settlement_period', sa.SmallInteger(), nullable=False),
        sa.Column('generation_mw', sa.Integer(), nullable=False),
        sa.Column('publish_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('start_time', name='uq_wind_actuals_start_time'),
    )
    op.create_index('ix_wind_actuals_settlement_date', 'wind_actuals', ['settlement_date'])

    op.create_table(
        'wind_forecasts',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('generation_mw', sa.Integer(), nullable=False),
        sa.Column('publish_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('start_time', 'publish_time', name='uq_wind_forecasts_start_publish'),
    )
    op.create_index('ix_wind_forecasts_publish_time', 'wind_forecasts', ['publish_time'])
    op.create_index('ix_wind_forecasts_start_time', 'wind_forecasts', ['start_time'])

    op.create_table(
        'sync_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('dataset', sa.String(length=20), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('records_fetched', sa.Integer(), nullable=True),
        sa.Column('records_upserted', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('sync_log')
    op.drop_table('wind_forecasts')
    op.drop_table('wind_actuals')
