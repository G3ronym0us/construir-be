export class CustomerResponseDto {
  id: string;
  type: 'registered' | 'guest';
  name: string;
  email: string;
  phone: string | null;
  identification: string | null;
  totalOrders: number;
  totalSpent: number;
  totalSpentVes: number;
  firstOrderDate: Date | null;
  lastOrderDate: Date | null;
  createdAt: Date;
}

export class CustomerListResponseDto {
  data: CustomerResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CustomerDetailResponseDto {
  customer: {
    id: string;
    type: 'registered' | 'guest';
    name: string;
    email: string;
    phone: string | null;
    identification: string | null;
    createdAt: Date;
  };
  stats: {
    totalOrders: number;
    totalSpentUSD: number;
    totalSpentVES: number;
    averageOrderValue: number;
    firstOrderDate: Date | null;
    lastOrderDate: Date | null;
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    date: Date;
    total: number;
    status: string;
  }>;
}
