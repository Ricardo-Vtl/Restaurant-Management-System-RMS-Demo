"use client";

import type { ReactNode } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface TabCardProps {
  title: string;
  description: string;
  onSave: () => void;
  isPending: boolean;
  isDirty: boolean;
  children: ReactNode;
}

export function TabCard({ title, description, onSave, isPending, isDirty, children }: TabCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-navy">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
      <CardFooter className="sticky bottom-0 z-20 -mb-6 flex items-center justify-end gap-2 rounded-b-xl bg-card/95 px-6 py-4 shadow-[0_-1px_0_0_var(--border)] backdrop-blur">
        {isDirty && !isPending ? (
          <span className="mr-auto text-xs font-medium text-coral">Cambios sin guardar</span>
        ) : (
          !isPending && (
            <span className="mr-auto text-xs text-muted-foreground">Sin cambios pendientes</span>
          )
        )}
        <Button onClick={onSave} disabled={!isDirty || isPending} className="bg-coral hover:bg-coral/90">
          {isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
          Guardar cambios
        </Button>
      </CardFooter>
    </Card>
  );
}
