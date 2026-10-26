export interface ActualPointDTO {
  start_time: string;
  settlement_period: number;
  generation_mw: number;
}

export interface ActualsByDateDTO {
  date: string;
  points: ActualPointDTO[];
}
