import { Save, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { updateProfileAction } from "@/app/(club)/settings/actions";
import { AvatarUploadField } from "@/app/(club)/settings/avatar-upload-field";
import { ClubAvatar } from "@/components/primitives";
import { RouteShell } from "@/components/route-shell";
import { Button } from "@/components/ui/button";
import { getAuthenticatedPocketBase } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const saved = getParam(params, "saved") === "1";
  const error = getStatusMessage(params, "error");
  const { user } = await getSettingsUser();

  return (
    <RouteShell eyebrow="MEMBER SETTINGS" title="Profile" className="max-w-4xl">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="surface-panel rounded-lg p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl">Board identity</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
                This is the name and face the crew sees on ratings, reactions, history, and stats.
              </p>
            </div>
            <ClubAvatar
              imageUrl={user.avatarUrl}
              initials={user.initials}
              label={user.displayName}
              size="lg"
            />
          </div>

          {saved && (
            <div className="mb-4 rounded-md border border-[color-mix(in_srgb,var(--good)_58%,transparent)] bg-[color-mix(in_srgb,var(--good)_13%,transparent)] px-3 py-2 text-sm text-[var(--ink)]">
              Profile updated.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-md border border-[color-mix(in_srgb,var(--accent)_62%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-2 text-sm text-[var(--ink)]">
              {error}
            </div>
          )}

          <form action={updateProfileAction} className="grid gap-5">
            <label className="grid gap-1.5">
              <span className="tag">display name</span>
              <input
                autoComplete="name"
                className="input-control"
                defaultValue={user.displayName}
                maxLength={80}
                minLength={2}
                name="displayName"
                required
              />
            </label>

            <label className="grid gap-1.5">
              <span className="tag">email</span>
              <input
                autoComplete="email"
                className="input-control text-[var(--ink-soft)]"
                readOnly
                value={user.email}
              />
            </label>

            <AvatarUploadField />

            {user.avatarUrl && (
              <label className="flex items-center gap-3 rounded-md border border-[var(--line-strong)] bg-[var(--paper-2)] px-3 py-3 text-sm text-[var(--ink-soft)]">
                <input
                  className="size-4 accent-[var(--accent)]"
                  name="removeAvatar"
                  type="checkbox"
                />
                Remove current avatar when no new file is selected
              </label>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="accent">
                <Save className="size-4" />
                Save profile
              </Button>
            </div>
          </form>
        </section>

        <aside className="surface-panel rounded-lg p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-[var(--good)]" />
            <h2 className="text-xl">Account</h2>
          </div>
          <dl className="mt-5 grid gap-4">
            <div>
              <dt className="tag">member id</dt>
              <dd className="mono mt-1 break-all text-sm text-[var(--ink-soft)]">{user.id}</dd>
            </div>
            <div>
              <dt className="tag">login email</dt>
              <dd className="mt-1 break-all text-sm text-[var(--ink-soft)]">{user.email}</dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-[var(--line-strong)] pt-4 text-sm leading-6 text-[var(--ink-soft)]">
            Password and email changes stay manual for now so the invite-only account list remains
            easy to supervise.
          </p>
        </aside>
      </div>
    </RouteShell>
  );
}

async function getSettingsUser() {
  try {
    return await getAuthenticatedPocketBase();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }
}

function getParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function getStatusMessage(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = getParam(searchParams, key)?.trim();
  return value ? value.slice(0, 180) : undefined;
}
