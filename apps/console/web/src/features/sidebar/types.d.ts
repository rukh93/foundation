import type { LucideIcon } from 'lucide-react';

export type Item = {
	title: string;
	url: string;
};

export type GroupItem = Omit<Item, 'url'> & {
	title: string;
	url?: string;
	icon?: LucideIcon;
	items?: GroupItem[];
};

export type Group = {
	title: string;
	items: GroupItem[];
};
