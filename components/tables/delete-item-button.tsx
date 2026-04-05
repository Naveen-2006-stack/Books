"use client";

import { useState, useTransition } from "react";
import { deleteItemAction } from "@/app/(app)/items/actions";
import { Button } from "@/components/ui/button";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        className="h-8 px-2 text-rose-700 hover:bg-rose-50"
        onClick={() => {
          startTransition(async () => {
            const result = await deleteItemAction(itemId);
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
