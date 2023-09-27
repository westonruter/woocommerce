<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\Internal\Orders;

use Automattic\Jetpack\Constants;
use Automattic\WooCommerce\Blocks\Package;
use Automattic\WooCommerce\Blocks\Domain\Services\ExtendRestApi;
use Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController;
use Automattic\WooCommerce\Internal\Features\FeaturesController;
use Automattic\WooCommerce\Internal\RegisterHooksInterface;
use Automattic\WooCommerce\Internal\Traits\ScriptDebug;
use Automattic\WooCommerce\Internal\Traits\SourceAttributionMeta;
use Automattic\WooCommerce\Proxies\LegacyProxy;
use Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema;
use Exception;
use WC_Customer;
use WC_Log_Levels;
use WC_Logger_Interface;
use WC_Order;
use WC_Tracks;
use WP_User;

/**
 * Class SourceAttributionController
 *
 * @since x.x.x
 */
class SourceAttributionController implements RegisterHooksInterface {

	use ScriptDebug;
	use SourceAttributionMeta;

	/**
	 * The FeatureController instance.
	 *
	 * @var FeaturesController
	 */
	private $feature_controller;

	/**
	 * WooCommerce logger class instance.
	 *
	 * @var WC_Logger_Interface
	 */
	private $logger;

	/**
	 * The LegacyProxy instance.
	 *
	 * @var LegacyProxy
	 */
	private $proxy;

	/**
	 * Initialization method.
	 *
	 * Takes the place of the constructor within WooCommerce Dependency injection.
	 *
	 * @internal
	 *
	 * @param LegacyProxy              $proxy  The legacy proxy.
	 * @param WC_Logger_Interface|null $logger The logger object. If not provided, it will be obtained from the proxy.
	 */
	final public function init( LegacyProxy $proxy, FeaturesController $controller, ?WC_Logger_Interface $logger = null ) {
		$this->proxy              = $proxy;
		$this->feature_controller = $controller;
		$this->logger             = $logger ?? $proxy->call_function( 'wc_get_logger' );
		$this->set_fields_and_prefix();
	}

	/**
	 * Register this class instance to the appropriate hooks.
	 *
	 * @since x.x.x
	 * @return void
	 */
	public function register() {
		// Bail if the feature is not enabled.
		if ( ! $this->feature_controller->feature_is_enabled( 'order_source_attribution' ) ) {
			return;
		}

		add_action(
			'wp_enqueue_scripts',
			function() {
				$this->enqueue_scripts_and_styles();
			}
		);

		add_action(
			'admin_enqueue_scripts',
			function() {
				$this->enqueue_admin_scripts_and_styles();
			}
		);

		// Include our hidden fields on order notes and registration form.
		$source_form_fields = function() {
			$this->source_form_fields();
		};

		add_action( 'woocommerce_after_order_notes', $source_form_fields );
		add_action( 'woocommerce_register_form', $source_form_fields );

		// Update data based on submitted fields.
		add_action(
			'woocommerce_checkout_order_created',
			function( $order ) {
				// phpcs:ignore WordPress.Security.NonceVerification
				$source_data = $this->get_source_values( $_POST );
				$this->send_order_tracks( $source_data, $order );
				$this->set_order_source_data( $source_data, $order );
			}
		);

		add_action(
			'user_register',
			function( $customer_id ) {
				try {
					$customer = new WC_Customer( $customer_id );
					$this->set_customer_source_data( $customer );
				} catch ( Exception $e ) {
					$this->log( $e->getMessage(), __METHOD__, WC_Log_Levels::ERROR );
				}
			}
		);

		// Add output to the User display page.
		$customer_meta_boxes = function( WP_User $user ) {
			if ( ! current_user_can( 'manage_woocommerce' ) ) {
				return;
			}

			try {
				$customer = new WC_Customer( $user->ID );
				$this->display_customer_source_data( $customer );
			} catch ( Exception $e ) {
				$this->log( $e->getMessage(), __METHOD__, WC_Log_Levels::ERROR );
			}
		};

		add_action( 'show_user_profile', $customer_meta_boxes );
		add_action( 'edit_user_profile', $customer_meta_boxes );

		// Add source data to the order table.
		add_filter(
			'manage_edit-shop_order_columns',
			function( $columns ) {
				$columns['origin'] = esc_html__( 'Origin', 'woocommerce' );

				return $columns;
			}
		);

		add_action(
			'manage_shop_order_posts_custom_column',
			function( $column_name, $order_id ) {
				if ( 'origin' !== $column_name ) {
					return;
				}
				$this->display_origin_column( $order_id );
			},
			10,
			2
		);

		add_action(
			'init',
			function() {
				$this->register_blocks();
			}
		);
	}

	/**
	 * Scripts & styles for custom source tracking and cart tracking.
	 */
	private function enqueue_scripts_and_styles() {
		wp_enqueue_script(
			'sourcebuster-js',
			plugins_url( "assets/js/frontend/sourcebuster{$this->get_script_suffix()}.js", WC_PLUGIN_FILE ),
			array( 'jquery' ),
			Constants::get_constant( 'WC_VERSION' ),
			true
		);

		wp_enqueue_script(
			'woocommerce-order-source-attribution-js',
			plugins_url( "assets/js/frontend/order-source-attribution{$this->get_script_suffix()}.js", WC_PLUGIN_FILE ),
			array( 'jquery', 'sourcebuster-js' ),
			Constants::get_constant( 'WC_VERSION' ),
			true
		);

		// Pass parameters to Order Source Attribution JS.
		$params = array(
			'lifetime'      => (int) apply_filters( 'wc_order_source_attribution_cookie_lifetime_months', 6 ),
			'session'       => (int) apply_filters( 'wc_order_source_attribution_session_length_minutes', 30 ),
			'ajaxurl'       => admin_url( 'admin-ajax.php' ),
			'prefix'        => $this->field_prefix,
			'allowTracking' => wc_bool_to_string( apply_filters( 'wc_order_source_attribution_allow_tracking', true ) ),
		);

		wp_localize_script( 'woocommerce-order-source-attribution-js', 'wc_order_attribute_source_params', $params );
	}

	/**
	 * Enqueue the stylesheet for admin pages.
	 *
	 * @since x.x.x
	 * @return void
	 */
	private function enqueue_admin_scripts_and_styles() {
		$screen            = get_current_screen();
		$order_page_suffix = $this->is_hpos_enabled() ? wc_get_page_screen_id( 'shop-order' ) : 'shop_order';
		if ( $screen->id !== $order_page_suffix ) {
			return;
		}

		// phpcs:ignore WordPress.WP.EnqueuedResourceParameters.NotInFooter
		wp_enqueue_script(
			'woocommerce-order-source-attribution-admin-js',
			plugins_url( "assets/js/admin/order-source-attribution-admin{$this->get_script_suffix()}.js", WC_PLUGIN_FILE ),
			array( 'jquery' ),
			Constants::get_constant( 'WC_VERSION' )
		);
	}

	/**
	 * Display the source data template for the customer.
	 *
	 * @param WC_Customer $customer The customer object.
	 *
	 * @return void
	 */
	private function display_customer_source_data( WC_Customer $customer ) {
		$meta = $this->filter_meta_data( $customer->get_meta_data() );

		// If we don't have any meta to show, return.
		if ( empty( $meta ) ) {
			return;
		}

		include dirname( WC_PLUGIN_FILE ) . '/templates/order/source-data-fields.php';
	}

	/**
	 * Display the origin column in the orders table.
	 *
	 * @since x.x.x
	 *
	 * @param int $order_id The order ID.
	 *
	 * @return void
	 */
	private function display_origin_column( $order_id ): void {
		try {
			// Ensure we've got a valid order.
			$order = $this->get_hpos_order_object( $order_id );
			$this->output_origin_column( $order );
		} catch ( Exception $e ) {
			return;
		}
	}

	/**
	 * Output the data for the Origin column in the orders table.
	 *
	 * @param WC_Order $order The order object.
	 *
	 * @return void
	 */
	private function output_origin_column( WC_Order $order ) {
		$source_type = $order->get_meta( $this->get_meta_prefixed_field( 'type' ) );
		$source      = $order->get_meta( $this->get_meta_prefixed_field( 'utm_source' ) ) ?: __( '(none)', 'woocommerce' );
		echo esc_html( $this->get_origin_label( $source_type, $source ) );
	}

	/**
	 * Add attribution hidden input fields for checkout & customer register froms.
	 */
	private function source_form_fields() {
		foreach ( $this->fields as $field ) {
			printf( '<input type="hidden" name="%s" value="" />', esc_attr( $this->get_prefixed_field( $field ) ) );
		}
	}

	/**
	 * Save source data for a Customer object.
	 *
	 * @param WC_Customer $customer The customer object.
	 *
	 * @return void
	 */
	private function set_customer_source_data( WC_Customer $customer ) {
		// phpcs:ignore WordPress.Security.NonceVerification
		foreach ( $this->get_source_values( $_POST ) as $key => $value ) {
			$customer->add_meta_data( $this->get_meta_prefixed_field( $key ), $value );
		}

		$customer->save_meta_data();
	}

	/**
	 * Save source data for an Order object.
	 *
	 * @param WC_Order $order The order object.
	 *
	 * @return void
	 */
	private function set_order_source_data( array $source_data, WC_Order $order ) {
		foreach ( $source_data as $key => $value ) {
			$order->add_meta_data( $this->get_meta_prefixed_field( $key ), $value );
		}

		$order->save_meta_data();
	}

	/**
	 * Log a message as a debug log entry.
	 *
	 * @param string $message The message to log.
	 * @param string $method  The method that is logging the message.
	 * @param string $level   The log level.
	 */
	private function log( string $message, string $method, string $level = WC_Log_Levels::DEBUG ) {
		/**
		 * Filter to enable debug mode.
		 *
		 * @since x.x.x
		 *
		 * @param string $enabled 'yes' to enable debug mode, 'no' to disable.
		 */
		if ( 'yes' !== apply_filters( 'wc_order_source_attribution_debug_mode_enabled', 'no' ) ) {
			return;
		}

		$this->logger->log(
			$level,
			sprintf( '%s %s', $method, $message ),
			array( 'source' => 'woocommerce-order-source-attribution' )
		);
	}

	/**
	 * Check to see if HPOS is enabled.
	 *
	 * @return bool
	 */
	private function is_hpos_enabled(): bool {
		try {
			/** @var CustomOrdersTableController $cot_controller */
			$cot_controller = wc_get_container()->get( CustomOrdersTableController::class );

			return $cot_controller->custom_orders_table_usage_is_enabled();
		} catch ( Exception $e ) {
			$this->log( $e->getMessage(), __METHOD__, WC_Log_Levels::ERROR );
			return false;
		}
	}

	/**
	 * Send order source data to Tracks.
	 *
	 * @param array    $source_data The source data.
	 * @param WC_Order $order       The order object.
	 *
	 * @return void
	 */
	private function send_order_tracks( array $source_data, WC_Order $order ) {
		$tracks_data = array(
			'order_id'      => $order->get_id(),
			'origin'        => $source_data['origin'] ?? '',
			'device_type'   => $source_data['device_type'] ?? '(unknown)',
			'session_pages' => $source_data['session_pages'] ?? 0,
			'order_total'   => $order->get_total(),
		);

		$this->proxy->call_static( WC_Tracks::class, 'record_event', 'order_source_attribution', $tracks_data );
	}

	/**
	 * Register our blocks.
	 *
	 * @since x.x.x
	 *
	 * @return void
	 */
	private function register_blocks() {
		try {
			$args = $this->get_register_block_args();
			if ( function_exists( 'woocommerce_store_api_register_endpoint_data' ) ) {
				woocommerce_store_api_register_endpoint_data( $args );
			} else {
				/** @var ExtendRestApi $extend */
				$extend = Package::container()->get( ExtendRestApi::class );
				$extend->register_endpoint_data( $args );
			}
		} catch ( Exception $e ) {
			$this->log( $e->getMessage(), __METHOD__, WC_Log_Levels::ERROR );
		}
	}

	/**
	 * Get the arguments to register the block.
	 *
	 * @since x.x.x
	 *
	 * @return array
	 */
	private function get_register_block_args() {
		return array(
			'endpoint'        => CheckoutSchema::IDENTIFIER,
			'namespace'       => 'woocommerce/order-source-attribution',
			'schema_callback' => function () {
				$fields = array();
				foreach ( $this->fields as $field ) {
					$fields[ $this->get_prefixed_field( $field ) ] = array(
						'description' => $this->get_field_description( $field ),
						'type'        => 'string',
						'context'     => array( 'view', 'edit' ),
						'arg_options' => array(
							'validate_callback' => function ( $value ) {
								return is_string( $value );
							},
						),
					);
				}

				return $fields;
			},
		);
	}
}
