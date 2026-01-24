'use client';

import type { OrganizationCreditBalance } from '@repo/types';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { useActionState } from 'react';

import { applyCredits } from '@/app/(admin)/feature/actions';

type State =
  | { ok: true; data: OrganizationCreditBalance | undefined; message: string }
  | { ok: false; message: string }
  | null;

const initialState: State = null;

export function Form() {
  const [state, action, pending] = useActionState(applyCredits, initialState);

  return (
    <main className="mx-auto max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Form</CardTitle>
        </CardHeader>

        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Feature name</Label>
              <Input id="text" name="text" type="text" placeholder="Enter a string" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (can be negative)</Label>
              <Input id="amount" name="amount" type="number" step="any" placeholder="-10" required />
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Submitting…' : 'Submit'}
            </Button>

            {state && <p className={`text-sm ${state.ok ? 'text-green-600' : 'text-red-600'}`}>{state.message}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
