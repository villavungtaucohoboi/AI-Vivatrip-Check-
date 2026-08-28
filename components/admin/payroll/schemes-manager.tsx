"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Department, SalaryComponent, SalaryScheme, SalaryTier } from "@/lib/payroll-types";

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export function SchemesManager({
  initialSchemes,
  departments,
}: {
  initialSchemes: SalaryScheme[];
  departments: Department[];
}) {
  const [schemes, setSchemes] = useState(initialSchemes);
  const [newSchemeName, setNewSchemeName] = useState("");
  const [newSchemeDept, setNewSchemeDept] = useState("");
  const [creatingScheme, setCreatingScheme] = useState(false);

  async function handleCreateScheme() {
    if (!newSchemeName.trim()) {
      toast.error("Vui lòng nhập tên cơ chế.");
      return;
    }
    setCreatingScheme(true);
    const res = await fetch("/api/admin/payroll-schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSchemeName, department_id: newSchemeDept || undefined }),
    });
    const result = await res.json();
    setCreatingScheme(false);
    if (!res.ok) {
      toast.error(result.error ?? "Có lỗi xảy ra");
      return;
    }
    setSchemes((prev) => [...prev, { id: result.id, name: newSchemeName, department_id: newSchemeDept || null, effective_from: null, effective_to: null, active: true, components: [] }]);
    setNewSchemeName("");
    setNewSchemeDept("");
    toast.success("Đã tạo cơ chế lương mới");
  }

  function updateComponentLocal(schemeId: string, componentId: string, patch: Partial<SalaryComponent>) {
    setSchemes((prev) =>
      prev.map((s) =>
        s.id !== schemeId
          ? s
          : { ...s, components: s.components?.map((c) => (c.id === componentId ? { ...c, ...patch } : c)) }
      )
    );
  }

  async function saveComponent(componentId: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/payroll-components/${componentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function handleAddComponent(schemeId: string, type: "percentage_tiered" | "fixed") {
    const res = await fetch("/api/admin/payroll-components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheme_id: schemeId, name: "Khoản mới", component_type: "income", calculation_type: type }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error ?? "Có lỗi xảy ra");
      return;
    }
    const newComp: SalaryComponent = {
      id: result.id,
      scheme_id: schemeId,
      name: "Khoản mới",
      component_type: "income",
      calculation_type: type,
      config_json: type === "percentage_tiered" ? { tiers: [{ min: 0, max: null, rate: 0 }] } : { amount: 0 },
      sort_order: 999,
      include_in_net_pay: true,
      active: true,
    };
    setSchemes((prev) => prev.map((s) => (s.id === schemeId ? { ...s, components: [...(s.components ?? []), newComp] } : s)));
  }

  async function handleDeleteComponent(schemeId: string, componentId: string) {
    await fetch(`/api/admin/payroll-components/${componentId}`, { method: "DELETE" });
    setSchemes((prev) =>
      prev.map((s) => (s.id === schemeId ? { ...s, components: s.components?.filter((c) => c.id !== componentId) } : s))
    );
    toast.success("Đã xoá khoản");
  }

  function updateTierLocal(schemeId: string, componentId: string, tierIdx: number, field: keyof SalaryTier, value: number | null) {
    setSchemes((prev) =>
      prev.map((s) => {
        if (s.id !== schemeId) return s;
        return {
          ...s,
          components: s.components?.map((c) => {
            if (c.id !== componentId) return c;
            const tiers = [...(c.config_json.tiers ?? [])];
            tiers[tierIdx] = { ...tiers[tierIdx], [field]: value };
            return { ...c, config_json: { ...c.config_json, tiers } };
          }),
        };
      })
    );
  }

  function addTier(schemeId: string, componentId: string) {
    setSchemes((prev) =>
      prev.map((s) => {
        if (s.id !== schemeId) return s;
        return {
          ...s,
          components: s.components?.map((c) => {
            if (c.id !== componentId) return c;
            const tiers = [...(c.config_json.tiers ?? []), { min: 0, max: null, rate: 0 }];
            return { ...c, config_json: { ...c.config_json, tiers } };
          }),
        };
      })
    );
  }

  function removeTier(schemeId: string, componentId: string, tierIdx: number) {
    setSchemes((prev) =>
      prev.map((s) => {
        if (s.id !== schemeId) return s;
        return {
          ...s,
          components: s.components?.map((c) => {
            if (c.id !== componentId) return c;
            const tiers = (c.config_json.tiers ?? []).filter((_, i) => i !== tierIdx);
            return { ...c, config_json: { ...c.config_json, tiers } };
          }),
        };
      })
    );
  }

  async function persistComponentConfig(componentId: string, schemeId: string) {
    const comp = schemes.find((s) => s.id === schemeId)?.components?.find((c) => c.id === componentId);
    if (!comp) return;
    await saveComponent(componentId, { config_json: comp.config_json });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-4">
        <p className="mb-3 text-[13px] font-bold text-ink">+ Tạo cơ chế lương mới</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={newSchemeName} onChange={(e) => setNewSchemeName(e.target.value)} placeholder="VD: MARKETING 2026" className="flex-1" />
          <Select value={newSchemeDept} onChange={(e) => setNewSchemeDept(e.target.value)} className="sm:w-40">
            <option value="">Phòng ban</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <button
            onClick={handleCreateScheme}
            disabled={creatingScheme}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-teal-dark"
          >
            {creatingScheme ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo
          </button>
        </div>
      </div>

      {schemes.map((scheme) => (
        <div key={scheme.id} className="rounded-2xl border border-border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[14.5px] font-bold text-ink">{scheme.name}</p>
            <span className="rounded-full bg-paper-dim px-2.5 py-0.5 text-[11px] text-ink-muted">
              {departments.find((d) => d.id === scheme.department_id)?.name ?? "Chưa gán phòng"}
            </span>
          </div>

          {(scheme.components ?? []).map((comp) => (
            <div key={comp.id} className="border-t border-border py-2.5">
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={comp.name}
                  onBlur={(e) => {
                    if (e.target.value !== comp.name) {
                      updateComponentLocal(scheme.id, comp.id, { name: e.target.value });
                      saveComponent(comp.id, { name: e.target.value });
                    }
                  }}
                  className="h-9 flex-1 text-[13px] font-semibold"
                />
                <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${comp.calculation_type === "percentage_tiered" ? "bg-teal-light text-teal-dark" : comp.calculation_type === "fixed" ? "bg-sand-light text-sand-dark" : "bg-paper-dim text-ink-muted"}`}>
                  {comp.calculation_type === "percentage_tiered" ? "% theo bậc" : comp.calculation_type === "fixed" ? "VNĐ cố định" : comp.calculation_type === "quantity_rate" ? "SL x đơn giá" : "Nhập tay"}
                </span>
                <button onClick={() => handleDeleteComponent(scheme.id, comp.id)} className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-danger-light hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {comp.calculation_type === "percentage_tiered" && (
                <div className="ml-1 mt-2 space-y-1.5 border-l-2 border-border pl-3">
                  {(comp.config_json.tiers ?? []).map((tier, ti) => (
                    <div key={ti} className="flex items-center gap-1.5 text-[11.5px]">
                      <Input
                        type="number"
                        defaultValue={tier.min}
                        onBlur={(e) => { updateTierLocal(scheme.id, comp.id, ti, "min", Number(e.target.value)); persistComponentConfig(comp.id, scheme.id); }}
                        className="h-7 w-24 px-2 text-[11px]"
                      />
                      <span className="text-ink-muted">–</span>
                      <Input
                        type="number"
                        defaultValue={tier.max ?? ""}
                        placeholder="Trở lên"
                        onBlur={(e) => { updateTierLocal(scheme.id, comp.id, ti, "max", e.target.value ? Number(e.target.value) : null); persistComponentConfig(comp.id, scheme.id); }}
                        className="h-7 w-24 px-2 text-[11px]"
                      />
                      <span className="text-ink-muted">:</span>
                      <Input
                        type="number"
                        defaultValue={tier.rate}
                        onBlur={(e) => { updateTierLocal(scheme.id, comp.id, ti, "rate", Number(e.target.value)); persistComponentConfig(comp.id, scheme.id); }}
                        className="h-7 w-16 px-2 text-[11px] font-bold"
                      />
                      <span className="text-ink-muted">%</span>
                      <button onClick={() => { removeTier(scheme.id, comp.id, ti); persistComponentConfig(comp.id, scheme.id); }} className="text-ink-muted hover:text-danger">✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => addTier(scheme.id, comp.id)}
                    className="text-[11px] font-semibold text-teal-dark"
                  >
                    + Thêm bậc
                  </button>
                </div>
              )}

              {comp.calculation_type === "fixed" && (
                <div className="ml-1 mt-2 flex items-center gap-2 text-[12px]">
                  <span className="text-ink-muted">Số tiền cố định:</span>
                  <Input
                    type="number"
                    defaultValue={comp.config_json.amount ?? 0}
                    onBlur={(e) => {
                      const amount = Number(e.target.value);
                      updateComponentLocal(scheme.id, comp.id, { config_json: { amount } });
                      saveComponent(comp.id, { config_json: { amount } });
                    }}
                    className="h-8 w-40 text-[12px] font-bold"
                  />
                  <span className="text-ink-muted">({fmt(comp.config_json.amount ?? 0)})</span>
                </div>
              )}

              {comp.calculation_type === "quantity_rate" && (
                <div className="ml-1 mt-2 flex items-center gap-2 text-[12px]">
                  <span className="text-ink-muted">Đơn giá:</span>
                  <Input
                    type="number"
                    defaultValue={comp.config_json.rate ?? 0}
                    onBlur={(e) => {
                      const rate = Number(e.target.value);
                      const config = { ...comp.config_json, rate };
                      updateComponentLocal(scheme.id, comp.id, { config_json: config });
                      saveComponent(comp.id, { config_json: config });
                    }}
                    className="h-8 w-32 text-[12px] font-bold"
                  />
                  <span className="text-ink-muted">/ {comp.config_json.unit || "đơn vị"}</span>
                </div>
              )}

              {comp.calculation_type === "manual" && (
                <p className="ml-1 mt-1.5 text-[11.5px] text-ink-muted">Admin nhập tay số tiền mỗi kỳ lương trong Salary Editor.</p>
              )}
            </div>
          ))}

          <div className="mt-3 flex gap-2">
            <button onClick={() => handleAddComponent(scheme.id, "percentage_tiered")} className="flex-1 rounded-xl border border-dashed border-border py-2 text-[12px] font-semibold text-ink-muted hover:bg-paper-dim">
              + Thêm khoản %
            </button>
            <button onClick={() => handleAddComponent(scheme.id, "fixed")} className="flex-1 rounded-xl border border-dashed border-border py-2 text-[12px] font-semibold text-ink-muted hover:bg-paper-dim">
              + Thêm khoản VNĐ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
