/**
 * External dependencies
 */
import {
	createElement,
	useState,
	useRef,
	createInterpolateElement,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { withSpokenMessages, Popover } from '@wordpress/components';
import { prependHTTP } from '@wordpress/url';
import { useSelect } from '@wordpress/data';
import {
	create,
	Format,
	insert,
	isCollapsed,
	applyFormat,
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore Types do not exist for @wordpress/rich-text yet.
	useAnchorRef,
	removeFormat,
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore Types do not exist for @wordpress/rich-text yet.
	RichTextValue,
	slice,
	replace,
	Value,
} from '@wordpress/rich-text';
// eslint-disable-next-line @woocommerce/dependency-group
import {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment, @wordpress/no-unsafe-wp-apis
	// @ts-ignore
	__experimentalLinkControl as LinkControl,
	store as blockEditorStore,
} from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import { createLinkFormat, isValidHref, getFormatBoundary } from './utils';
import { link as settings } from './index';
import useLinkInstanceKey from './use-link-instance-key';
import { FormatAtts } from '../types';

type InlineLinkUIProps = {
	isActive: boolean;
	value: Value;
	activeAttributes: FormatAtts;
	onChange( value: Value ): void;
	contentRef?: React.Ref< HTMLElement >;
	addingLink: boolean;
	stopAddingLink: () => void;
	speak: ( text: string, type?: string ) => void;
};

function getRichTextValueFromSelection(
	value: RichTextValue,
	isActive: boolean
) {
	// Default to the selection ranges on the RichTextValue object.
	let textStart = value.start;
	let textEnd = value.end;

	// If the format is currently active then the rich text value
	// should always be taken from the bounds of the active format
	// and not the selected text.
	if ( isActive ) {
		const boundary = getFormatBoundary( value, {
			type: settings.name,
		} );

		if ( ! boundary.start || ! boundary.end ) {
			return null;
		}

		textStart = boundary.start;

		// Text *selection* always extends +1 beyond the edge of the format.
		// We account for that here.
		textEnd = boundary.end + 1;
	}

	// Get a RichTextValue containing the selected text content.
	return slice( value, textStart, textEnd );
}

function InlineLinkUI( {
	isActive,
	activeAttributes,
	addingLink,
	value,
	onChange,
	speak,
	stopAddingLink,
	contentRef,
}: InlineLinkUIProps ) {
	const richLinkTextValue = getRichTextValueFromSelection( value, isActive );

	// Get the text content minus any HTML tags.
	const richTextText = richLinkTextValue?.text || '';

	/**
	 * Pending settings to be applied to the next link. When inserting a new
	 * link, toggle values cannot be applied immediately, because there is not
	 * yet a link for them to apply to. Thus, they are maintained in a state
	 * value until the time that the link can be inserted or edited.
	 *
	 * @type {[Object|undefined,Function]}
	 */
	const [ nextLinkValue, setNextLinkValue ] = useState<
		Record< string, string > | undefined
	>();

	const { createPageEntity, userCanCreatePages } = useSelect( ( select ) => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore Selector exists in blockEditorStore.
		const { getSettings } = select( blockEditorStore );
		const _settings = getSettings();

		return {
			createPageEntity: _settings.__experimentalCreatePageEntity,
			userCanCreatePages: _settings.__experimentalUserCanCreatePages,
		};
	}, [] );

	const linkValue = {
		url: activeAttributes.url,
		type: activeAttributes.type,
		id: activeAttributes.id,
		opensInNewTab: activeAttributes.target === '_blank',
		title: richTextText,
		...nextLinkValue,
	};

	function removeLink() {
		const newValue = removeFormat( value, settings.name );
		onChange( newValue );
		stopAddingLink();
		speak( __( 'Link removed.', 'woocommerce' ), 'assertive' );
	}

	function onChangeLink( nextValue: RichTextValue ) {
		// Merge with values from state, both for the purpose of assigning the
		// next state value, and for use in constructing the new link format if
		// the link is ready to be applied.
		nextValue = {
			...nextLinkValue,
			...nextValue,
		};

		// LinkControl calls `onChange` immediately upon the toggling a setting.
		const didToggleSetting =
			linkValue.opensInNewTab !== nextValue.opensInNewTab &&
			linkValue.url === nextValue.url;

		// If change handler was called as a result of a settings change during
		// link insertion, it must be held in state until the link is ready to
		// be applied.
		const didToggleSettingForNewLink =
			didToggleSetting && nextValue.url === undefined;

		// If link will be assigned, the state value can be considered flushed.
		// Otherwise, persist the pending changes.
		setNextLinkValue( didToggleSettingForNewLink ? nextValue : undefined );

		if ( didToggleSettingForNewLink ) {
			return;
		}

		const newUrl = prependHTTP( nextValue.url );
		const linkFormat = createLinkFormat( {
			url: newUrl,
			type: nextValue.type,
			id:
				nextValue.id !== undefined && nextValue.id !== null
					? String( nextValue.id )
					: undefined,
			opensInNewWindow: nextValue.opensInNewTab,
		} ) as Format;

		const newText = nextValue.title || newUrl;
		if ( isCollapsed( value ) && ! isActive ) {
			// Scenario: we don't have any actively selected text or formats.
			const toInsert = applyFormat(
				create( { text: newText } ),
				linkFormat,
				0,
				newText.length
			);
			onChange( insert( value, toInsert ) );
		} else {
			// Scenario: we have any active text selection or an active format.
			let newValue;

			if ( newText === richTextText ) {
				// If we're not updating the text then ignore.
				newValue = applyFormat( value, linkFormat );
			} else {
				// Create new RichText value for the new text in order that we
				// can apply formats to it.
				newValue = create( { text: newText } );

				// Apply the new Link format to this new text value.
				newValue = applyFormat(
					newValue,
					linkFormat,
					0,
					newText.length
				);

				// Update the original (full) RichTextValue replacing the
				// target text with the *new* RichTextValue containing:
				// 1. The new text content.
				// 2. The new link format.
				// Note original formats will be lost when applying this change.
				// That is expected behaviour.
				// See: https://github.com/WordPress/gutenberg/pull/33849#issuecomment-936134179.
				newValue = replace(
					value,
					richTextText,
					newValue as RichTextValue
				);
			}

			newValue.start = newValue.end;
			newValue.activeFormats = [];
			onChange( newValue );
		}

		// Focus should only be shifted back to the formatted segment when the
		// URL is submitted.
		if ( ! didToggleSetting ) {
			stopAddingLink();
		}

		if ( ! isValidHref( newUrl ) ) {
			speak(
				__(
					'Warning: the link has been inserted but may have errors. Please test it.',
					'woocommerce'
				),
				'assertive'
			);
		} else if ( isActive ) {
			speak( __( 'Link edited.', 'woocommerce' ), 'assertive' );
		} else {
			speak( __( 'Link inserted.', 'woocommerce' ), 'assertive' );
		}
	}

	const anchorRef = useAnchorRef( { ref: contentRef, value, settings } );

	// Generate a string based key that is unique to this anchor reference.
	// This is used to force re-mount the LinkControl component to avoid
	// potential stale state bugs caused by the component not being remounted
	// See https://github.com/WordPress/gutenberg/pull/34742.
	const forceRemountKey = useLinkInstanceKey( anchorRef );

	// The focusOnMount prop shouldn't evolve during render of a Popover
	// otherwise it causes a render of the content.
	const focusOnMount = useRef( addingLink ? 'firstElement' : false );

	async function handleCreate( pageTitle: string ) {
		const page = await createPageEntity( {
			title: pageTitle,
			status: 'draft',
		} );

		return {
			id: page.id,
			type: page.type,
			title: page.title.rendered,
			url: page.link,
			kind: 'post-type',
		};
	}

	function createButtonText( searchTerm: string ) {
		return createInterpolateElement(
			sprintf(
				/* translators: %s: search term. */
				__( 'Create Page: <mark>%s</mark>', 'woocommerce' ),
				searchTerm
			),
			{ mark: <mark /> }
		);
	}

	return (
		<Popover
			anchorRef={ anchorRef }
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore This is the behavior copied from Gutenberg's link popover.
			focusOnMount={ focusOnMount.current }
			onClose={ stopAddingLink }
			position="bottom center"
			shift
		>
			<LinkControl
				key={ forceRemountKey }
				value={ linkValue }
				onChange={ onChangeLink }
				onRemove={ removeLink }
				forceIsEditingLink={ addingLink }
				hasRichPreviews
				createSuggestion={ createPageEntity && handleCreate }
				withCreateSuggestion={ userCanCreatePages }
				createSuggestionButtonText={ createButtonText }
				hasTextControl
			/>
		</Popover>
	);
}

export default withSpokenMessages( InlineLinkUI );