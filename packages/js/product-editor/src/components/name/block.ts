export default {
	$schema: 'https://schemas.wp.org/trunk/block.json',
	apiVersion: 2,
	name: 'woocommerce/product-name',
	title: 'Product name',
	category: 'widgets',
	description: 'The product name.',
	keywords: [ 'products', 'name', 'title' ],
	textdomain: 'default',
	attributes: {},
	ancestor: [ 'woocommerce/product-form' ],
	supports: {},
	style: 'wp-paragraph',
};