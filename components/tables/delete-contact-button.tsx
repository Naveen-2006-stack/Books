"use client";

import { useTransition, useState } from "react";
import { deleteContactAction } from "@/app/(app)/contacts/actions";
import { Button } from "@/components/ui/button";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        className="h-8 px-2 text-rose-700 hover:bg-rose-50"
        onClick={() => {
          startTransition(async () => {
            const result = await deleteContactAction(contactId);
            setMessage(result.ok ? "Deleted" : result.message);
          });
        }}
        disabled={isPending}
      >
        {isPending ? "..." : "Delete"}
      </Button>
      {message ? <span className="text-[10px] text-slate-500">{message}</span> : null}
    </div>
  );
}
