export interface Department {
  id: string;
  name: string;
}

export interface SalaryTier {
  min: number;
  max: number | null;
  rate: number;
}

export interface SalaryComponent {
  id: string;
  scheme_id: string;
  name: string;
  component_type: "income" | "deduction" | "info";
  calculation_type: "fixed" | "manual" | "percentage_tiered" | "quantity_rate";
  config_json: { amount?: number; tiers?: SalaryTier[]; rate?: number; unit?: string };
  sort_order: number;
  include_in_net_pay: boolean;
  active: boolean;
}

export interface SalaryScheme {
  id: string;
  name: string;
  department_id: string | null;
  effective_from: string | null;
  effective_to: string | null;
  active: boolean;
  components?: SalaryComponent[];
}

export interface PayrollEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  position: string | null;
  department_id: string | null;
  salary_scheme_id: string | null;
  must_change_password: boolean;
  is_active: boolean;
  base_salary: number;
  default_allowance: number;
  default_insurance: number;
  join_date: string | null;
  date_of_birth: string | null;
}

export interface PayrollPeriod {
  id: string;
  month: number;
  year: number;
  status: "draft" | "calculated" | "approved" | "locked";
  locked_at: string | null;
}

export interface PayslipItemInput {
  component_id: string;
  component_name: string;
  component_type: "income" | "deduction" | "info";
  calculation_type: string;
  input_value?: number;
  manual_amount?: number;
}
