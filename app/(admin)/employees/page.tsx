'use client';

// app/(admin)/employees/page.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Edit2, UserX, Users, IndianRupee, ShieldCheck, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { createEmployeeSchema, updateEmployeeSchema } from '@/lib/validations/employee';
import type { Employee, SalarySetting } from '@/lib/types';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/validations/employee';

interface ExtendedEmployee extends Employee {
  salary_setting?: SalarySetting | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<ExtendedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<ExtendedEmployee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  const createForm = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      department: 'Operations',
      designation: 'Staff',
      joining_date: todayStr,
      address: '',
      password: '',
      salary_per_day: 0,
      is_pf_enabled: false,
      pf_amount: 0,
    },
  });

  const editForm = useForm<UpdateEmployeeInput>({
    resolver: zodResolver(updateEmployeeSchema),
  });

  const isAddPfEnabled = createForm.watch('is_pf_enabled');
  const isEditPfEnabled = editForm.watch('is_pf_enabled');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) {
        setEmployees([]);
        return;
      }
      const json = await res.json();
      setEmployees(json.data ?? []);
    } catch (err) {
      console.error('[EmployeesPage] fetch error:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const filtered = employees.filter((e) =>
    (e.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.employee_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: CreateEmployeeInput) => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to create employee'); return; }
      setAddOpen(false);
      createForm.reset({
        full_name: '',
        phone: '',
        department: 'Operations',
        designation: 'Staff',
        joining_date: todayStr,
        address: '',
        password: '',
        salary_per_day: 0,
        is_pf_enabled: false,
        pf_amount: 0,
      });
      fetchEmployees();
    } catch (err) {
      console.error('[handleCreate] error:', err);
      setError('Connection error. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (data: UpdateEmployeeInput) => {
    if (!editEmployee) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${editEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to update employee'); return; }
      setEditEmployee(null);
      fetchEmployees();
    } catch (err) {
      console.error('[handleEdit] error:', err);
      setError('Connection error. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleDeactivate = async (emp: ExtendedEmployee) => {
    if (!confirm(`Deactivate employee "${emp.full_name}" (${emp.employee_number})?`)) return;
    await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
    fetchEmployees();
  };

  const handleDelete = async (emp: ExtendedEmployee) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE employee "${emp.full_name}" (${emp.employee_number})?\n\nThis will permanently remove their records and login account.`)) return;
    try {
      const res = await fetch(`/api/employees/${emp.id}?permanent=true`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Failed to delete employee'); return; }
      fetchEmployees();
    } catch (err) {
      console.error('[handleDelete] error:', err);
      alert('Connection error. Could not delete employee.');
    }
  };

  const openEdit = (emp: ExtendedEmployee) => {
    setEditEmployee(emp);
    setError('');
    editForm.reset({
      full_name: emp.full_name,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      joining_date: emp.joining_date,
      address: emp.address ?? '',
      status: emp.status,
      salary_per_day: emp.salary_setting?.salary_per_day ?? 0,
      is_pf_enabled: emp.salary_setting?.is_pf_enabled ?? false,
      pf_amount: emp.salary_setting?.pf_amount ?? 0,
    });
  };

  const openAddModal = () => {
    setAddOpen(true);
    setError('');
    createForm.reset({
      full_name: '',
      phone: '',
      department: 'Operations',
      designation: 'Staff',
      joining_date: todayStr,
      address: '',
      password: '',
      salary_per_day: 0,
      is_pf_enabled: false,
      pf_amount: 0,
    });
  };

  const DEPARTMENTS = ['Operations', 'HR', 'Finance', 'IT', 'Sales', 'Admin', 'General'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <Users size={13} /> {employees.filter(e => e.status === 'active').length} active employees
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={15} />}
          onClick={openAddModal}
        >
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search employees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Table */}
      <Card>
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Emp No.', 'Name', 'Department', 'Phone', 'Daily Rate', 'PF Status', 'Status', 'Actions']
                  .map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">No employees found</td></tr>
              ) : (
                filtered.map((emp, i) => {
                  const salary = emp.salary_setting;
                  return (
                    <tr key={emp.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-blue-600">{emp.employee_number}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 whitespace-nowrap">{emp.full_name}</div>
                        <div className="text-[11px] text-slate-400">{emp.designation}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{emp.department}</td>
                      <td className="py-3 px-3 text-slate-600">{emp.phone}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {salary ? `₹${Number(salary.salary_per_day).toLocaleString('en-IN')}/day` : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {salary?.is_pf_enabled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck size={12} /> ₹{Number(salary.pf_amount).toLocaleString('en-IN')} PF
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No PF</span>
                        )}
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={emp.status} /></td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 size={14} />
                          </button>

                          {emp.status === 'active' && (
                            <button
                              onClick={() => handleDeactivate(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Deactivate Employee"
                            >
                              <UserX size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Permanently Delete Employee"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add New Employee"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={createForm.handleSubmit(handleCreate)}>
              Create Employee
            </Button>
          </>
        }
      >
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Full Name" placeholder="e.g. Rahul Sharma" error={createForm.formState.errors.full_name?.message} {...createForm.register('full_name')} />
            </div>
            <Input label="Phone" placeholder="10-digit number" error={createForm.formState.errors.phone?.message} {...createForm.register('phone')} />
            <Input label="Joining Date" type="date" error={createForm.formState.errors.joining_date?.message} {...createForm.register('joining_date')} />
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Department</label>
              <select className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...createForm.register('department')}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <Input label="Designation" placeholder="e.g. Operator" error={createForm.formState.errors.designation?.message} {...createForm.register('designation')} />
            <div className="sm:col-span-2">
              <Input label="Address (optional)" placeholder="Full address" {...createForm.register('address')} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Initial Password (optional)" type="password" placeholder="Defaults to phone number" {...createForm.register('password')} />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <IndianRupee size={14} /> Salary & PF Deduction Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <Input
                label="Daily Salary Rate (₹/day)"
                type="number"
                step="0.01"
                placeholder="e.g. 800"
                error={createForm.formState.errors.salary_per_day?.message}
                {...createForm.register('salary_per_day', { valueAsNumber: true })}
              />

              <div className="sm:col-span-2 flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="add_is_pf_enabled"
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  {...createForm.register('is_pf_enabled')}
                />
                <label htmlFor="add_is_pf_enabled" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" /> Enable Provident Fund (PF) Deduction
                </label>
              </div>

              {isAddPfEnabled && (
                <div className="sm:col-span-2">
                  <Input
                    label="Monthly PF Deduction Amount (₹)"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1200"
                    error={createForm.formState.errors.pf_amount?.message}
                    {...createForm.register('pf_amount', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editEmployee}
        onClose={() => setEditEmployee(null)}
        title={`Edit — ${editEmployee?.full_name}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditEmployee(null)}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={editForm.handleSubmit(handleEdit)}>
              Save Changes
            </Button>
          </>
        }
      >
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Full Name" {...editForm.register('full_name')} error={editForm.formState.errors.full_name?.message} />
            </div>
            <Input label="Phone" {...editForm.register('phone')} error={editForm.formState.errors.phone?.message} />
            <Input label="Joining Date" type="date" {...editForm.register('joining_date')} />
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Department</label>
              <select className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...editForm.register('department')}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <Input label="Designation" {...editForm.register('designation')} />
            <div className="sm:col-span-2">
              <Input label="Address" {...editForm.register('address')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Status</label>
              <select className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...editForm.register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <IndianRupee size={14} /> Salary & PF Deduction Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <Input
                label="Daily Salary Rate (₹/day)"
                type="number"
                step="0.01"
                placeholder="e.g. 800"
                error={editForm.formState.errors.salary_per_day?.message}
                {...editForm.register('salary_per_day', { valueAsNumber: true })}
              />

              <div className="sm:col-span-2 flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="edit_is_pf_enabled"
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  {...editForm.register('is_pf_enabled')}
                />
                <label htmlFor="edit_is_pf_enabled" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" /> Enable Provident Fund (PF) Deduction
                </label>
              </div>

              {isEditPfEnabled && (
                <div className="sm:col-span-2">
                  <Input
                    label="Monthly PF Deduction Amount (₹)"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1200"
                    error={editForm.formState.errors.pf_amount?.message}
                    {...editForm.register('pf_amount', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
