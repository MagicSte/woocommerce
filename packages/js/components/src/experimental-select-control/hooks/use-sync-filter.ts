/**
 * External dependencies
 */
import { useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { SelectControlProps } from '../select-control';

export default function useSyncFilter< T >( {
	filter,
	onFilterStart,
	onFilterEnd,
	onInputChange,
	...props
}: UseSyncFilterInput< T > ): SelectControlProps< T > {
	const handleInputChange = useCallback(
		function handleInputChangeCallback( value?: string ) {
			if ( onFilterStart ) onFilterStart( value );
			const filteredItems = filter( value );
			if ( onFilterEnd ) onFilterEnd( filteredItems, value );

			if ( onInputChange ) onInputChange( value );
		},
		[ filter, onFilterStart, onFilterEnd, onInputChange ]
	);

	return { ...props, onInputChange: handleInputChange };
}

export type UseSyncFilterInput< T > = SelectControlProps< T > & {
	filter( value?: string ): T[];
	onFilterStart?( value?: string ): void;
	onFilterEnd?( filteredItems: T[], value?: string ): void;
};