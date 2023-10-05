/**
 * External dependencies
 */
import { Popover } from '@wordpress/components';
import { useState } from '@wordpress/element';

export default function StatusPopover( props: {
	text: string;
	explanation: string;
} ) {
	const [ isVisible, setIsVisible ] = useState( false );
	const toggleVisible = () => {
		setIsVisible( ( state ) => ! state );
	};

	return (
		<button onClick={ toggleVisible }>
			{ props.text }
			{ isVisible && <Popover>{ props.explanation }</Popover> }
		</button>
	);
}
