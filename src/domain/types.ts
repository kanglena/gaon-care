export type UmbrellaStatus = "available" | "borrowed" | "lost" | "maintenance";

export type Umbrella = {
  id: string;
  label: string;
  qrPayload: string;
  status: UmbrellaStatus;
};

export type Rental = {
  id: string;
  umbrellaId: string;
  studentId: string;
  borrowedAt: string;
  returnedAt: string | null;
};

export type ActiveRental = Rental & {
  returnedAt: null;
};
