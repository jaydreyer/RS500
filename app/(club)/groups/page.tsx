import { CheckCircle2, Disc3, Hourglass, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { ClubAvatar } from "@/components/primitives";
import { RouteShell } from "@/components/route-shell";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getAllGroupDrawState } from "@/lib/group-draw";
import type { UserGroupDraw } from "@/lib/group-draw-types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  let groupState;

  try {
    await getAuthenticatedPocketBase();
    groupState = await getAllGroupDrawState();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return (
    <RouteShell eyebrow="GROUP DRAWS" title="Groups">
      <div className="-mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl font-quote text-xl leading-snug text-[var(--ink-soft)]">
          Active groups, member readiness, and shared spin status.
        </p>
      </div>

      {groupState.groups.length === 0 ? (
        <div className="pressed-panel rounded-lg p-6 text-center">
          <p className="tag">No active groups yet</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groupState.groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </RouteShell>
  );
}

function GroupCard({ group }: { group: UserGroupDraw }) {
  const status = getGroupStatus(group);

  return (
    <article className="hard-panel overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line-strong)] bg-[var(--paper-2)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="title-wrap text-2xl">{group.name}</h2>
          </div>
          <p className="tag mt-1">
            {group.members.length} {group.members.length === 1 ? "member" : "members"} /{" "}
            {group.poolLeft} shared left
          </p>
        </div>
        <span
          className={cn(
            "tag inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5",
            status.tone === "ready" &&
              "border-[color-mix(in_srgb,var(--good)_45%,var(--line-strong))] bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[var(--good)]",
            status.tone === "blocked" &&
              "border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)]",
            status.tone === "done" &&
              "border-[var(--line-strong)] bg-[var(--ink)] text-[var(--paper)]",
          )}
        >
          <status.Icon className="size-3.5" aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="grid gap-5 p-5">
        {group.currentDraw ? (
          <div className="rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
            <p className="tag text-[var(--accent)]">active group pick</p>
            <p className="title-wrap mt-1 font-display text-2xl font-extrabold">
              {group.currentDraw.album.title}
            </p>
            <p className="mt-1 font-quote text-lg leading-tight text-[var(--ink-soft)]">
              {group.currentDraw.album.artist} / #{group.currentDraw.album.rank}
            </p>
          </div>
        ) : group.blockedMembers.length > 0 ? (
          <div className="rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
            <p className="tag text-[var(--accent)]">reviews due from</p>
            <p className="mt-1 font-display text-xl font-extrabold">
              {group.blockedMembers.map((member) => member.displayName).join(", ")}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-4 py-3">
            <p className="tag text-[var(--good)]">ready to spin</p>
          </div>
        )}

        <div>
          <p className="tag mb-3">members</p>
          <div className="grid gap-2">
            {group.members.map((member) => {
              const blocked = group.blockedMembers.some((entry) => entry.id === member.id);

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--card)] px-3 py-2"
                >
                  <ClubAvatar
                    imageUrl={member.avatarUrl}
                    initials={member.initials}
                    label={member.displayName}
                  />
                  <span className="min-w-0 flex-1 truncate font-display font-extrabold">
                    {member.displayName}
                  </span>
                  <span
                    className={cn(
                      "tag shrink-0",
                      blocked ? "text-[var(--accent)]" : "text-[var(--ink-soft)]",
                    )}
                  >
                  {blocked ? "review due" : "clear"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

function getGroupStatus(group: UserGroupDraw) {
  if (group.currentDraw) {
    return {
      label: "spun",
      tone: "done" as const,
      Icon: Disc3,
    };
  }

  if (group.blockedMembers.length > 0) {
    return {
      label: "waiting",
      tone: "blocked" as const,
      Icon: Hourglass,
    };
  }

  return {
    label: "ready",
    tone: "ready" as const,
    Icon: CheckCircle2,
  };
}
