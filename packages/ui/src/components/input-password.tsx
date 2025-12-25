'use client';

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@repo/ui/components/ui/input-group';
import { Eye,EyeOff } from "lucide-react";
import { ComponentProps,useState } from "react";

function InputPassword({ ...props }: ComponentProps<'input'>) {
	const [showPassword, setShowPassword] = useState<boolean>(false);

	return (
		<InputGroup>
			<InputGroupInput {...props} type={showPassword ? 'text' : 'password'} />
			<InputGroupAddon align="inline-end">
				<InputGroupButton
					onClick={() => setShowPassword(!showPassword)}
					size="icon-xs"
				>
					{showPassword ? <Eye /> : <EyeOff />}
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}

export { InputPassword };
