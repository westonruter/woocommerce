<?php

namespace Automattic\WooCommerce\Internal\Blocks;

use Automattic\Jetpack\Constants;
use Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface;
use Automattic\WooCommerce\Internal\Traits\ScriptDebug;
use Automattic\WooCommerce\Utilities\VersionUtil;

/**
 * Class OrderSourceAttributionFields
 *
 * @since x.x.x
 */
class OrderSourceAttributionFields implements IntegrationInterface {

	use ScriptDebug;

	/** @var VersionUtil */
	private $version_util;

	/**
	 * Init this class instance.
	 *
	 * @param VersionUtil $version_util
	 *
	 * @return void
	 */
	final public function init( VersionUtil $version_util ) {
		$this->version_util = $version_util;
	}

	/**
	 * The name of the integration.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'woocommerce';
	}

	/**
	 * When called invokes any initialization/setup for the integration.
	 */
	public function initialize() {
		$plugin_path = plugin_dir_path( WC_PLUGIN_FILE );
		$script_path = "{$plugin_path}assets/js/blocks/order-source-attribution/order-source-attribution.js";
		$script_url  = plugins_url( 'assets/js/blocks/order-source-attribution/order-source-attribution.js' );

		$script_asset_path = str_replace( '.js', '.asset.php', $script_path );
		$script_asset = file_exists( $script_asset_path )
			? require $script_asset_path
			: array(
				'dependencies' => array(),
				'version'      => $this->get_file_version( $script_path ),
			);

		$script_args = $this->version_util->wp_version_at_least( '6.3' )
			? array(
				'in_footer' => true,
			)
			: true;


		wp_register_script(
			'woocommerce-order-source-attributioin-block-frontend',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			$script_args
		);
	}

	/**
	 * Returns an array of script handles to enqueue in the frontend context.
	 *
	 * @return string[]
	 */
	public function get_script_handles() {
		return array( 'woocommerce-order-source-attribution-block-frontend' );
	}

	/**
	 * Returns an array of script handles to enqueue in the editor context.
	 *
	 * @return string[]
	 */
	public function get_editor_script_handles() {
		return array();
	}

	/**
	 * An array of key, value pairs of data made available to the block on the client side.
	 *
	 * @return array
	 */
	public function get_script_data() {
		return array();
	}

	/**
	 * Get the file version.
	 *
	 * @since x.x.x
	 *
	 * @param string $file
	 *
	 * @return int|string
	 */
	private function get_file_version( string $file ) {
		return $this->is_script_debug_enabled() && file_exists( $file )
			? filemtime( $file )
			: Constants::get_constant( 'WC_VERSION' );
	}
}
