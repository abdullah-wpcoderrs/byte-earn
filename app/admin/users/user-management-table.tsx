"use client";

import { useMemo, useState } from "react";
import { Coins, ShieldCheck, Trash2, UserCog, UserMinus, UserPlus, XCircle } from "lucide-react";
import { bulkUserAction, createAdminUserAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { AdminUserRow } from "@/lib/admin";

type UserManagementTableProps = {
  users: AdminUserRow[];
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EmptyValue({ value }: { value: string | null }) {
  return <span className={value ? "text-slate-100" : "text-slate-500"}>{value || "Not set"}</span>;
}

function Detail({ label, value }: { label: string; value: string | number | boolean | null }) {
  return (
    <div className="grid gap-1 border-b border-white/10 py-2 last:border-0">
      <span className="text-[10px] font-semibold uppercase text-slate-500">{label}</span>
      <span className="break-words text-slate-100">{typeof value === "boolean" ? (value ? "Yes" : "No") : value ?? "Not set"}</span>
    </div>
  );
}

function SingleUserActions({ user }: { user: AdminUserRow }) {
  return (
    <div className="grid gap-3">
      <form action={bulkUserAction} className="grid gap-3">
        <input name="userIds" type="hidden" value={user.id} />
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <TextInput icon={<Coins className="size-4" />} label="Credits" name="credits" inputMode="numeric" placeholder="0" />
          <TextInput label="Reason" name="reason" placeholder="Ledger description" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button icon={<UserPlus className="size-4" />} name="bulkAction" type="submit" value="credit">
            Add credits
          </Button>
          <Button icon={<UserMinus className="size-4" />} name="bulkAction" type="submit" value="deduct" variant="secondary">
            Deduct
          </Button>
          <Button icon={<XCircle className="size-4" />} name="bulkAction" type="submit" value="remove" variant="secondary">
            Clear balance
          </Button>
        </div>
      </form>

      <form action={bulkUserAction} className="grid gap-3 border-t border-white/10 pt-3">
        <input name="userIds" type="hidden" value={user.id} />
        <TextInput label="Admin note" name="reason" placeholder="Reason for account change" />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button icon={<ShieldCheck className="size-4" />} name="bulkAction" type="submit" value="activate" variant="secondary">
            Activate
          </Button>
          <Button icon={<UserCog className="size-4" />} name="bulkAction" type="submit" value="make_admin" variant="secondary">
            Make admin
          </Button>
          <Button icon={<UserMinus className="size-4" />} name="bulkAction" type="submit" value="remove_admin" variant="secondary">
            Remove admin
          </Button>
          <Button icon={<XCircle className="size-4" />} name="bulkAction" type="submit" value="suspend" variant="danger">
            Suspend
          </Button>
          <Button className="sm:col-span-2" icon={<Trash2 className="size-4" />} name="bulkAction" type="submit" value="delete" variant="danger">
            Delete profile
          </Button>
        </div>
      </form>
    </div>
  );
}

export function UserManagementTable({ users }: UserManagementTableProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const selectedUserName = useMemo(() => selectedUser?.displayName ?? "Unnamed user", [selectedUser]);

  return (
    <>
      <div className="flex justify-end">
        <Button icon={<UserPlus className="size-4" />} onClick={() => setCreateModalOpen(true)} type="button">
          Create new user
        </Button>
      </div>

      <form action={bulkUserAction} className="glass overflow-hidden">
        <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-[180px_130px_1fr_auto]">
          <Select label="Bulk action" name="bulkAction" required>
            <option value="credit">Credit selected</option>
            <option value="deduct">Deduct points</option>
            <option value="remove">Remove balance</option>
            <option value="activate">Activate</option>
            <option value="suspend">Suspend</option>
            <option value="make_admin">Make admin</option>
            <option value="remove_admin">Remove admin</option>
            <option value="delete">Delete profile</option>
          </Select>
          <TextInput icon={<Coins className="size-4" />} label="Credits" name="credits" inputMode="numeric" placeholder="0" />
          <TextInput label="Reason" name="reason" placeholder="Visible ledger or audit description" />
          <Button className="self-end" icon={<UserMinus className="size-4" />} type="submit" variant="secondary">
            Apply
          </Button>
        </div>

        <div className="hidden grid-cols-[44px_1.4fr_110px_110px_110px_120px] border-b border-white/10 px-4 py-3 font-semibold text-slate-300 md:grid">
          <span />
          <span>User</span>
          <span>Status</span>
          <span>Role</span>
          <span>Referrals</span>
          <span>Credits</span>
        </div>

        <div className="divide-y divide-white/10">
          {users.map((user) => (
            <div
              className="grid cursor-pointer gap-3 p-4 transition hover:bg-white/[0.035] md:grid-cols-[44px_1.4fr_110px_110px_110px_120px] md:items-center"
              key={user.id}
              onClick={() => setSelectedUser(user)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedUser(user);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <input
                aria-label={`Select ${user.displayName ?? user.referralCode}`}
                className="size-4 accent-cyan-300"
                name="userIds"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                }}
                type="checkbox"
                value={user.id}
              />
              <span className="grid gap-1 text-left">
                <span className="block font-semibold text-slate-100">{user.displayName ?? "Unnamed user"}</span>
                <span className="text-muted">{user.referralCode}</span>
              </span>
              <span className="rounded-[5px] border border-white/10 px-2 py-1 text-center text-slate-200">{user.status}</span>
              <span className="text-slate-300">{user.role}</span>
              <span className="text-slate-300">{user.referralCount}</span>
              <span className="font-semibold text-cyan-100">{user.creditsBalance.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {users.length === 0 ? <div className="p-6 text-center text-muted">No users match these filters.</div> : null}
      </form>

      <Modal className="max-w-xl" onClose={() => setCreateModalOpen(false)} open={createModalOpen} title="Create new user">
        <form action={createAdminUserAction} className="grid gap-3">
          <TextInput label="Display name" name="displayName" placeholder="Amina Kareem" required />
          <TextInput label="Email" name="email" placeholder="amina@example.com" required type="email" />
          <TextInput label="Password" minLength={8} name="password" placeholder="Minimum 8 characters" required type="password" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select defaultValue="user" label="Role" name="role" required>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
            <Select defaultValue="active" label="Status" name="status" required>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="pending_payment">Pending payment</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
          <Button className="mt-1" icon={<UserPlus className="size-4" />} type="submit">
            Create user
          </Button>
        </form>
      </Modal>

      <Modal className="max-w-3xl" onClose={() => setSelectedUser(null)} open={Boolean(selectedUser)} title={selectedUserName}>
        {selectedUser ? (
          <div className="app-scrollbar grid max-h-[78vh] gap-4 overflow-y-auto pr-1">
            <div className="grid gap-2 rounded-[5px] border border-white/10 bg-white/[0.045] p-3 sm:grid-cols-2">
              <Detail label="Profile ID" value={selectedUser.id} />
              <Detail label="Referral code" value={selectedUser.referralCode} />
              <Detail label="Status" value={selectedUser.status} />
              <Detail label="Role" value={selectedUser.role} />
              <Detail label="Credits" value={selectedUser.creditsBalance.toLocaleString()} />
              <Detail label="Referrals" value={selectedUser.referralCount} />
              <Detail label="Sponsored locked" value={selectedUser.sponsoredCreditsLocked} />
              <Detail label="Referred by" value={selectedUser.referredBy} />
              <Detail label="Created" value={formatDate(selectedUser.createdAt)} />
              <Detail label="Updated" value={formatDate(selectedUser.updatedAt)} />
            </div>

            <div className="grid gap-2 rounded-[5px] border border-white/10 bg-white/[0.045] p-3 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Bank</p>
                <EmptyValue value={selectedUser.bankName} />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Account number</p>
                <EmptyValue value={selectedUser.accountNumber} />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Account name</p>
                <EmptyValue value={selectedUser.accountName} />
              </div>
            </div>

            <SingleUserActions user={selectedUser} />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
