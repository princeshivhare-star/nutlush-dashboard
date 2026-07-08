"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search, Plus, X, Check, ChevronDown, ChevronUp, Edit3, Trash2,
  Phone, MapPin, Package, CalendarPlus, Droplet, Leaf, UserPlus,
} from "lucide-react";
import SignOutButton from "./SignOutButton";

type Status = "pending" | "delivered" | "cancelled";
type Delivery = { id: string; subscriber_id: string; date: string; qty: number; status: Status; note: string };
type Subscriber = { id: string; name: string; mobile: string; address: string; product: string; delivery_days: string; deliveries: Delivery[] };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_STYLE: Record<Status, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#FCF1DC", fg: "#8C6B1F", label: "Pending" },
  delivered: { bg: "#E4F3E8", fg: "#2E7D4F", label: "Delivered" },
  cancelled: { bg: "#FBE8E1", fg: "#B25B3E", label: "Cancelled" },
};

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function generateDates(startDate: string, weekdayIndex: number, count: number) {
  const dates: string[] = [];
  let cursor = startDate;
  while (new Date(cursor).getDay() !== weekdayIndex) cursor = addDays(cursor, 1);
  for (let i = 0; i < count; i++) dates.push(addDays(cursor, i * 7));
  return dates;
}

export default function Dashboard({ userEmail }: { userEmail: string }) {
  const supabase = createClient();
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);

  const loadData = useCallback(async () => {
    const [{ data: subRows }, { data: delRows }] = await Promise.all([
      supabase.from("subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("deliveries").select("*").order("date", { ascending: true }),
    ]);
    const merged: Subscriber[] = (subRows || []).map((s: any) => ({
      ...s,
      deliveries: (delRows || []).filter((d: any) => d.subscriber_id === s.id),
    }));
    setSubs(merged);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(
    () => subs.filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.mobile.includes(query)),
    [subs, query]
  );

  async function cycleStatus(delivery: Delivery) {
    const next: Status = delivery.status === "pending" ? "delivered" : delivery.status === "delivered" ? "cancelled" : "pending";
    setSubs((prev) => prev.map((s) => s.id !== delivery.subscriber_id ? s : {
      ...s, deliveries: s.deliveries.map((d) => d.id === delivery.id ? { ...d, status: next } : d),
    }));
    await supabase.from("deliveries").update({ status: next }).eq("id", delivery.id);
  }

  async function updateDelivery(delivery: Delivery, patch: Partial<Delivery>) {
    setSubs((prev) => prev.map((s) => s.id !== delivery.subscriber_id ? s : {
      ...s, deliveries: s.deliveries.map((d) => d.id === delivery.id ? { ...d, ...patch } : d),
    }));
    await supabase.from("deliveries").update(patch).eq("id", delivery.id);
  }

  async function addDeliveryDate(sub: Subscriber) {
    const last = sub.deliveries[sub.deliveries.length - 1];
    const nextDate = last ? addDays(last.date, 7) : todayISO();
    const { data } = await supabase
      .from("deliveries")
      .insert({ subscriber_id: sub.id, date: nextDate, qty: 1, status: "pending", note: "" })
      .select("*")
      .single();
    if (data) {
      setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, deliveries: [...s.deliveries, data] } : s));
    }
  }

  async function removeDeliveryDate(delivery: Delivery) {
    setSubs((prev) => prev.map((s) => s.id !== delivery.subscriber_id ? s : {
      ...s, deliveries: s.deliveries.filter((d) => d.id !== delivery.id),
    }));
    await supabase.from("deliveries").delete().eq("id", delivery.id);
  }

  async function saveNewSubscriber(form: {
    name: string; mobile: string; address: string; product: string;
    startDate: string; weekday: number; count: number; qty: number;
  }) {
    const { data: sub } = await supabase
      .from("subscribers")
      .insert({
        name: form.name, mobile: form.mobile, address: form.address, product: form.product,
        delivery_days: `Weekly (${WEEKDAYS[form.weekday]})`,
      })
      .select("*")
      .single();
    if (!sub) return;

    const dates = generateDates(form.startDate, form.weekday, form.count);
    const rows = dates.map((date) => ({ subscriber_id: sub.id, date, qty: form.qty, status: "pending" as Status, note: "" }));
    const { data: deliveries } = await supabase.from("deliveries").insert(rows).select("*");

    setSubs((prev) => [{ ...sub, deliveries: deliveries || [] }, ...prev]);
    setExpanded((e) => ({ ...e, [sub.id]: true }));
    setShowAdd(false);
  }

  async function saveEditedSubscriber(form: { id: string; name: string; mobile: string; address: string; product: string }) {
    await supabase.from("subscribers")
      .update({ name: form.name, mobile: form.mobile, address: form.address, product: form.product })
      .eq("id", form.id);
    setSubs((prev) => prev.map((s) => s.id === form.id ? { ...s, ...form } : s));
    setEditingSub(null);
  }

  async function deleteSubscriber(id: string) {
    setSubs((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("subscribers").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen bg-cream px-6 py-7">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-green-soft flex items-center justify-center">
              <Leaf size={16} className="text-green" />
            </div>
            <span className="font-display font-bold text-xl text-green-deep">Nutlush</span>
            <span className="text-sm text-inksoft font-medium">Paid subscribers</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInvite(true)}
              className="text-sm border border-line rounded-lg px-3 py-2 flex items-center gap-1.5 bg-white hover:bg-green-soft"
            >
              <UserPlus size={14} /> Team access
            </button>
            <SignOutButton />
          </div>
        </div>
        <div className="text-sm text-inksoft mb-5">
          {subs.length} paid subscriber{subs.length !== 1 ? "s" : ""} · tap the circle to mark a delivery done · signed in as {userEmail}
        </div>

        <div className="flex gap-2.5 mb-4">
          <div className="flex items-center gap-2 border border-line rounded-xl px-3.5 py-2 bg-white flex-1">
            <Search size={15} className="text-inksoft" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or mobile"
              className="border-none outline-none text-sm flex-1 bg-transparent"
            />
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-green text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-1.5">
            <Plus size={15} /> Add subscriber
          </button>
        </div>

        {loading ? (
          <div className="text-center text-inksoft text-sm py-16">Loading…</div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((s) => (
              <SubscriberCard
                key={s.id} sub={s} isOpen={!!expanded[s.id]}
                onToggle={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))}
                onEdit={() => setEditingSub(s)}
                onDelete={() => deleteSubscriber(s.id)}
                onCycle={cycleStatus}
                onUpdateDelivery={updateDelivery}
                onAddDate={() => addDeliveryDate(s)}
                onRemoveDate={removeDeliveryDate}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-inksoft text-sm py-16">No subscribers match your search.</div>
            )}
          </div>
        )}
      </div>

      {showAdd && <SubscriberModal onClose={() => setShowAdd(false)} onSave={saveNewSubscriber} />}
      {editingSub && <EditModal sub={editingSub} onClose={() => setEditingSub(null)} onSave={saveEditedSubscriber} />}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} supabase={supabase} />}
    </div>
  );
}

function SubscriberCard({ sub, isOpen, onToggle, onEdit, onDelete, onCycle, onUpdateDelivery, onAddDate, onRemoveDate }: any) {
  const pendingCount = sub.deliveries.filter((d: Delivery) => d.status === "pending").length;
  return (
    <div className="bg-white border border-line rounded-xl2 overflow-hidden">
      <div className="flex items-center gap-3.5 px-4.5 py-3.5 cursor-pointer" onClick={onToggle} style={{ padding: "14px 18px" }}>
        <div className="w-9 h-9 rounded-full bg-green-soft text-green flex items-center justify-center font-semibold text-sm flex-shrink-0">
          {sub.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm mb-0.5">{sub.name}</div>
          <div className="text-xs text-inksoft flex gap-3 flex-wrap">
            <span className="flex items-center gap-1"><Phone size={11} />{sub.mobile}</span>
            <span className="flex items-center gap-1"><Package size={11} />{sub.product}</span>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: STATUS_STYLE.pending.bg, color: STATUS_STYLE.pending.fg }}>
            {pendingCount} pending
          </span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="border border-line rounded-lg p-1.5 bg-white"><Edit3 size={13} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="border border-line rounded-lg p-1.5 bg-white"><Trash2 size={13} className="text-coral" /></button>
        {isOpen ? <ChevronUp size={16} className="text-inksoft" /> : <ChevronDown size={16} className="text-inksoft" />}
      </div>

      {isOpen && (
        <div className="border-t border-line px-4.5 pt-2.5 pb-4" style={{ padding: "10px 18px 16px" }}>
          <div className="text-xs text-inksoft mb-2.5 flex items-center gap-1.5"><MapPin size={12} /> {sub.address}</div>
          <div className="flex flex-col gap-1.5">
            {sub.deliveries.map((d: Delivery) => (
              <div key={d.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-cream">
                <Tick status={d.status} onCycle={() => onCycle(d)} />
                <input type="date" value={d.date} onChange={(e) => onUpdateDelivery(d, { date: e.target.value })}
                  className="border border-line rounded-md px-2 py-1.5 text-xs font-mono bg-white" style={{ width: 128 }} />
                <input type="number" step="0.1" value={d.qty} onChange={(e) => onUpdateDelivery(d, { qty: Number(e.target.value) })}
                  className="border border-line rounded-md px-2 py-1.5 text-xs bg-white" style={{ width: 56 }} title="Litres" />
                <input value={d.note} onChange={(e) => onUpdateDelivery(d, { note: e.target.value })} placeholder="Note (optional)"
                  className="border border-line rounded-md px-2 py-1.5 text-xs bg-white flex-1 min-w-0" />
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: STATUS_STYLE[d.status].bg, color: STATUS_STYLE[d.status].fg }}>
                  {STATUS_STYLE[d.status].label}
                </span>
                <button onClick={() => onRemoveDate(d)} className="p-1 flex-shrink-0"><X size={14} className="text-inksoft" /></button>
              </div>
            ))}
          </div>
          <button onClick={onAddDate} className="mt-2.5 border border-line rounded-lg px-3 py-1.5 text-xs font-semibold bg-white flex items-center gap-1.5">
            <CalendarPlus size={13} /> Extend / add delivery date
          </button>
        </div>
      )}
    </div>
  );
}

function Tick({ status, onCycle }: { status: Status; onCycle: () => void }) {
  const delivered = status === "delivered";
  const cancelled = status === "cancelled";
  const bg = delivered ? "#2E7D4F" : cancelled ? "#D08668" : "#fff";
  const border = delivered ? "#2E7D4F" : cancelled ? "#D08668" : "#DEEEE1";
  return (
    <button onClick={onCycle} title="Tap to change status" className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: 34, height: 34, border: `1.5px solid ${border}`, background: bg, boxShadow: delivered ? "0 2px 6px rgba(46,125,79,0.25)" : "none" }}>
      {delivered ? <Check size={16} color="#fff" strokeWidth={3} />
        : cancelled ? <X size={14} color="#fff" strokeWidth={3} />
        : <Droplet size={14} color="#71827A" />}
    </button>
  );
}

function SubscriberModal({ onClose, onSave }: any) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [product, setProduct] = useState("8L Almond Milk Subscription");
  const [startDate, setStartDate] = useState(todayISO());
  const [weekday, setWeekday] = useState(new Date().getDay());
  const [count, setCount] = useState(7);
  const [qty, setQty] = useState(1);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !mobile || !address) return;
    onSave({ name, mobile, address, product, startDate, weekday: Number(weekday), count: Number(count), qty: Number(qty) });
  }

  return (
    <ModalShell onClose={onClose} title="Add paid subscriber">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Customer name"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="Mobile number"><input required value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} /></Field>
        <Field label="Address"><input required value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></Field>
        <Field label="Product"><input value={product} onChange={(e) => setProduct(e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Delivery day">
            <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={inputCls}>
              {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
            </select>
          </Field>
          <Field label="Qty per delivery (L)"><input type="number" step="0.1" value={qty} onChange={(e) => setQty(Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Number of deliveries"><input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputCls} /></Field>
        </div>
        <div className="flex justify-end gap-2.5 mt-3">
          <button type="button" onClick={onClose} className="border border-line rounded-lg px-4 py-2 text-sm font-semibold bg-white">Cancel</button>
          <button type="submit" className="bg-green text-white rounded-lg px-4 py-2 text-sm font-semibold">Add subscriber</button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditModal({ sub, onClose, onSave }: any) {
  const [name, setName] = useState(sub.name);
  const [mobile, setMobile] = useState(sub.mobile);
  const [address, setAddress] = useState(sub.address);
  const [product, setProduct] = useState(sub.product);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ id: sub.id, name, mobile, address, product });
  }

  return (
    <ModalShell onClose={onClose} title="Edit subscriber">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Customer name"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="Mobile number"><input required value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} /></Field>
        <Field label="Address"><input required value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></Field>
        <Field label="Product"><input value={product} onChange={(e) => setProduct(e.target.value)} className={inputCls} /></Field>
        <div className="flex justify-end gap-2.5 mt-3">
          <button type="button" onClick={onClose} className="border border-line rounded-lg px-4 py-2 text-sm font-semibold bg-white">Cancel</button>
          <button type="submit" className="bg-green text-white rounded-lg px-4 py-2 text-sm font-semibold">Save changes</button>
        </div>
      </form>
    </ModalShell>
  );
}

function InviteModal({ onClose, supabase }: any) {
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<{ email: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    supabase.from("team_members").select("email").then(({ data }: any) => setMembers(data || []));
  }, [supabase]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const { error } = await supabase.from("team_members").insert({ email: email.trim().toLowerCase() });
    if (error) { setErrorMsg(error.message); setStatus("error"); return; }
    setMembers((m) => [...m, { email: email.trim().toLowerCase() }]);
    setEmail("");
    setStatus("idle");
  }

  async function removeMember(memberEmail: string) {
    await supabase.from("team_members").delete().eq("email", memberEmail);
    setMembers((m) => m.filter((x) => x.email !== memberEmail));
  }

  return (
    <ModalShell onClose={onClose} title="Team access">
      <p className="text-xs text-inksoft mb-3">
        Anyone added here can sign in with a magic link sent to their email — no password to share.
      </p>
      <form onSubmit={addMember} className="flex gap-2 mb-4">
        <input type="email" required placeholder="teammate@nutlush.in" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls + " flex-1"} />
        <button type="submit" disabled={status === "saving"} className="bg-green text-white rounded-lg px-4 py-2 text-sm font-semibold">Add</button>
      </form>
      {status === "error" && <div className="text-xs text-coral mb-3">{errorMsg}</div>}
      <div className="flex flex-col gap-1.5">
        {members.map((m) => (
          <div key={m.email} className="flex items-center justify-between bg-cream rounded-lg px-3 py-2 text-sm">
            <span>{m.email}</span>
            <button onClick={() => removeMember(m.email)} className="text-inksoft"><X size={14} /></button>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl2 p-6 w-full max-w-md max-h-[86vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <span className="font-display font-semibold text-lg">{title}</span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-inksoft font-medium">
      {label}
      {children}
    </label>
  );
}

const inputCls = "border border-line rounded-lg px-2.5 py-2 text-sm bg-cream outline-none focus:border-green";
