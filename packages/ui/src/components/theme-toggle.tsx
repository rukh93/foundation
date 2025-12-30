'use client';

import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

type Props = {
  labels?: {
    toggle?: string;
    light?: string;
    dark?: string;
    system?: string;
  };
};

export function ThemeToggle({ labels }: Props) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">{labels?.toggle ?? 'Toggle'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>{labels?.light ?? 'Light'}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>{labels?.dark ?? 'Dark'}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>{labels?.system ?? 'System'}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
