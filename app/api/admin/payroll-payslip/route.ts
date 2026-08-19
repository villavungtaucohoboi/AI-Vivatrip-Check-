import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calcTieredCommission, calcQuantityRate, type Tier } from "@/lib/payroll-calc";

interface InputItem {
  component_id: string;
  input_value?: number;
  manual_amount?: number;
}

export async function POST(req: NextRequest) {
  const body: { period_id: string; employee_id: string; inputs: InputItem[]; actor?: string } = await req.json();
  if (!body.period_id || !body.employee_id) {
    return NextResponse.json({ error: "Thiếu kỳ lương hoặc nhân viên." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: period } = await supabase.from("payroll_periods").select("*").eq("id", body.period_id).maybeSingle();
  if (!period) return NextResponse.json({ error: "Không tìm thấy kỳ lương." }, { status: 404 });
  if (period.status === "locked") {
    return NextResponse.json({ error: "Kỳ lương đã khoá — Admin cần mở khoá trước khi sửa." }, { status: 400 });
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id, full_name, salary_scheme_id")
    .eq("id", body.employee_id)
    .maybeSingle();
  if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên." }, { status: 404 });
  if (!employee.salary_scheme_id) {
    return NextResponse.json({ error: "Nhân viên chưa được gán cơ chế lương." }, { status: 400 });
  }

  const { data: components } = await supabase
    .from("salary_components")
    .select("*")
    .eq("scheme_id", employee.salary_scheme_id)
    .eq("active", true)
    .order("sort_order");

  const { data: scheme } = await supabase
    .from("salary_schemes")
    .select("*")
    .eq("id", employee.salary_scheme_id)
    .maybeSingle();

  const inputMap = new Map(body.inputs.map((i) => [i.component_id, i]));

  let totalIncome = 0;
  let totalDeduction = 0;
  const items: {
    component_name: string;
    component_type: string;
    calculation_type: string;
    input_value: Record<string, unknown> | null;
    calculated_value: number;
    breakdown_json: Record<string, unknown> | null;
    sort_order: number;
  }[] = [];

  for (const comp of components ?? []) {
    const input = inputMap.get(comp.id);
    let value = 0;
    let breakdown: Record<string, unknown> | null = null;
    let inputValueRecord: Record<string, unknown> | null = null;

    if (comp.calculation_type === "fixed") {
      value = comp.config_json?.amount ?? 0;
    } else if (comp.calculation_type === "manual") {
      value = input?.manual_amount ?? 0;
      inputValueRecord = { manual_amount: value };
    } else if (comp.calculation_type === "percentage_tiered") {
      const revenue = input?.input_value ?? 0;
      const tiers: Tier[] = comp.config_json?.tiers ?? [];
      const result = calcTieredCommission(revenue, tiers);
      value = result.amount;
      breakdown = { revenue, breakdown: result.breakdown };
      inputValueRecord = { revenue };
    } else if (comp.calculation_type === "quantity_rate") {
      const qty = input?.input_value ?? 0;
      const rate = comp.config_json?.rate ?? 0;
      value = calcQuantityRate(qty, rate);
      breakdown = { qty, rate };
      inputValueRecord = { qty };
    }

    if (comp.component_type === "deduction") value = -Math.abs(value);

    if (comp.include_in_net_pay !== false) {
      if (comp.component_type === "income") totalIncome += value;
      else if (comp.component_type === "deduction") totalDeduction += Math.abs(value);
    }

    items.push({
      component_name: comp.name,
      component_type: comp.component_type,
      calculation_type: comp.calculation_type,
      input_value: inputValueRecord,
      calculated_value: value,
      breakdown_json: breakdown,
      sort_order: comp.sort_order,
    });
  }

  const netPay = totalIncome - totalDeduction;

  const { data: existingSlip } = await supabase
    .from("payslips")
    .select("id")
    .eq("payroll_period_id", body.period_id)
    .eq("employee_id", body.employee_id)
    .maybeSingle();

  let payslipId: string;
  if (existingSlip) {
    payslipId = existingSlip.id;
    const { error } = await supabase
      .from("payslips")
      .update({
        scheme_snapshot: { scheme, components },
        total_income: totalIncome,
        total_deduction: totalDeduction,
        net_pay: netPay,
        status: "calculated",
      })
      .eq("id", payslipId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("payslip_items").delete().eq("payslip_id", payslipId);
  } else {
    const { data, error } = await supabase
      .from("payslips")
      .insert({
        payroll_period_id: body.period_id,
        employee_id: body.employee_id,
        scheme_snapshot: { scheme, components },
        total_income: totalIncome,
        total_deduction: totalDeduction,
        net_pay: netPay,
        status: "calculated",
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    payslipId = data.id;
  }

  const { error: itemsError } = await supabase
    .from("payslip_items")
    .insert(items.map((item) => ({ ...item, payslip_id: payslipId })));
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });

  await supabase.from("payroll_audit_logs").insert({
    actor: body.actor?.trim() || "Admin",
    entity_type: "payslip",
    entity_id: payslipId,
    field: "net_pay",
    new_value: String(netPay),
  });

  return NextResponse.json({ payslipId, totalIncome, totalDeduction, netPay });
}
