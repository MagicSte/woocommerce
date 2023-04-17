/**
 * External dependencies
 */
import { createElement, createContext, useContext } from '@wordpress/element';

export type LayoutContextType = {
	layoutString: string;
	updateLayoutPath: ( item: string ) => LayoutContextType;
	layoutPath: string[];
	decendentOf: ( item: string ) => boolean;
};

type LayoutContextProviderProps = {
	children: React.ReactNode;
	value: LayoutContextType;
};

export const LayoutContext = createContext< LayoutContextType | undefined >(
	undefined
);

export const getLayoutContextValue = (
	layoutPath: LayoutContextType[ 'layoutPath' ] = []
): LayoutContextType => ( {
	layoutPath: [ ...layoutPath ],
	updateLayoutPath: ( item ) => {
		const newLayoutPath = [ ...layoutPath, item ];

		return {
			...getLayoutContextValue( newLayoutPath ),
			layoutPath: newLayoutPath,
		};
	},
	layoutString: layoutPath.join( '/' ),
	decendentOf: ( item ) => layoutPath.includes( item ),
} );

export const LayoutContextProvider: React.FC< LayoutContextProviderProps > = ( {
	children,
	value,
} ) => (
	<LayoutContext.Provider value={ value }>
		{ children }
	</LayoutContext.Provider>
);

export const useLayoutContext = () => {
	const layoutContext = useContext( LayoutContext );

	if ( layoutContext === undefined ) {
		// eslint-disable-next-line no-console
		console.warn(
			'useLayoutContext must be used within a LayoutContextProvider'
		);
	}

	return layoutContext;
};
