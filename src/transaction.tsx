export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  type: TransactionType;
  date: string; // yyyy-mm-dd
}

export interface NewTransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}
