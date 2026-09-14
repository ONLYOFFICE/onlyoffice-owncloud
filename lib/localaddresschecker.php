<?php
/**
 * @author Ascensio System SIA <integration@onlyoffice.com>
 *
 * Copyright (C) Ascensio System SIA, 2009-2026
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation, together with the
 * additional terms provided in the LICENSE file.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For
 * details, see the GNU AGPL at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA by email at info@onlyoffice.com
 * or by postal mail at 20A-6 Ernesta Birznieka-Upisha Street, Riga,
 * LV-1050, Latvia, European Union.
 *
 * The interactive user interfaces in modified versions of the Program
 * are required to display Appropriate Legal Notices in accordance with
 * Section 5 of the GNU AGPL version 3.
 *
 * No trademark rights are granted under this License.
 *
 * All non-code elements of the Product, including illustrations,
 * icon sets, and technical writing content, are licensed under the
 * Creative Commons Attribution-ShareAlike 4.0 International License:
 * https://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 * This license applies only to such non-code elements and does not
 * modify or replace the licensing terms applicable to the Program's
 * source code, which remains licensed under the GNU Affero General
 * Public License v3.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

namespace OCA\Onlyoffice;

require_once __DIR__ . "/../3rdparty/iplib/ip-lib.php";

use IPLib\Address\IPv4;
use IPLib\Address\IPv6;
use IPLib\Factory;
use IPLib\ParseStringFlag;
use IPLib\Range\Subnet;

/**
 * Checker for addresses that are not reachable from the public internet
 *
 * @package OCA\Onlyoffice
 */
class LocalAddressChecker {
	/**
	 * Address ranges that can never host a document server, rejected whatever
	 * the configuration says
	 *
	 * @var array
	 */
	private const BLOCKEDRANGES = [
		"0.0.0.0/8",
		"100.100.100.200/32",
		"169.254.0.0/16",
		"192.0.0.0/24",
		"198.18.0.0/15",
		"224.0.0.0/4",
		"240.0.0.0/4",
		"::/128",
		"64:ff9b:1::/48",
		"100::/64",
		"fd00:ec2::254/128",
		"fe80::/10",
		"ff00::/8"
	];

	/**
	 * Private ranges that carry a document server in many deployments and are
	 * rejected only when local addresses are not allowed
	 *
	 * @var array
	 */
	private const LOCALRANGES = [
		"10.0.0.0/8",
		"100.64.0.0/10",
		"127.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"::1/128",
		"fc00::/7",
		"fec0::/10"
	];

	/**
	 * Ranges already parsed, keyed by their CIDR notation
	 *
	 * @var array
	 */
	private static $subnets = [];

	/**
	 * Check whether an address is one no document server can be reached at.
	 * Anything that cannot be parsed as an address is reported as blocked.
	 *
	 * @param string $ip - address to check
	 *
	 * @return bool
	 */
	public static function isBlocked($ip) {
		return self::inRanges($ip, self::BLOCKEDRANGES);
	}

	/**
	 * Check whether an address belongs to a private range
	 *
	 * @param string $ip - address to check
	 *
	 * @return bool
	 */
	public static function isLocal($ip) {
		return self::inRanges($ip, self::LOCALRANGES);
	}

	/**
	 * Resolve a host to every address it points at
	 *
	 * @param string $host - host to resolve
	 *
	 * @return array
	 */
	public static function resolve($host) {
		$literal = trim($host, "[]");
		if (@inet_pton($literal) !== false) {
			return [$literal];
		}

		$addresses = [];
		if (function_exists("socket_addrinfo_lookup")) {
			$infos = @socket_addrinfo_lookup($host, null, ["ai_socktype" => SOCK_STREAM]);
			foreach ($infos === false ? [] : $infos as $info) {
				$address = socket_addrinfo_explain($info)["ai_addr"];
				$addresses[] = $address["sin_addr"] ?? ($address["sin6_addr"] ?? null);
			}
		} else {
			$resolved = @gethostbynamel($host);
			$addresses = $resolved === false ? [] : $resolved;

			$records = @dns_get_record($host, DNS_AAAA);
			if ($records !== false) {
				$addresses = array_merge($addresses, array_column($records, "ipv6"));
			}
		}

		return array_values(array_unique(array_filter($addresses)));
	}

	/**
	 * Check whether any of the ranges contains an address
	 *
	 * @param string $ip - address to check
	 * @param array $ranges - ranges in CIDR notation
	 *
	 * @return bool
	 */
	private static function inRanges($ip, $ranges) {
		$address = self::parse($ip);
		if ($address === null) {
			return true;
		}

		foreach ($ranges as $cidr) {
			$subnet = self::subnet($cidr);
			if ($subnet !== null && $subnet->contains($address)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Parse an address, reducing the IPv6 forms that carry an IPv4 address to
	 * that address so that it is matched against the IPv4 ranges
	 *
	 * @param string $ip - address to parse
	 *
	 * @return \IPLib\Address\AddressInterface|null
	 */
	private static function parse($ip) {
		$address = Factory::parseAddressString(
			$ip,
			ParseStringFlag::IPV4_MAYBE_NON_DECIMAL
			| ParseStringFlag::IPV4ADDRESS_MAYBE_NON_QUAD_DOTTED
			| ParseStringFlag::MAY_INCLUDE_ZONEID
		);
		if ($address === null) {
			return null;
		}

		if ($address instanceof IPv6) {
			$embedded = self::embeddedIPv4($address);
			if ($embedded !== null) {
				return $embedded;
			}
		}

		return $address;
	}

	/**
	 * Get the IPv4 address an IPv6 address carries, if it carries one.
	 * The unspecified and loopback addresses are left alone, because they
	 * have their own entries among the ranges.
	 *
	 * @param IPv6 $address - address to reduce
	 *
	 * @return IPv4|null
	 */
	private static function embeddedIPv4(IPv6 $address) {
		$mapped = $address->toIPv4();
		if ($mapped !== null) {
			return $mapped;
		}

		$bytes = $address->getBytes();

		if (self::subnet("64:ff9b::/96")->contains($address)) {
			return IPv4::fromBytes(\array_slice($bytes, -4));
		}
		if (self::subnet("2001::/32")->contains($address)) {
			return IPv4::fromBytes(
				array_map(
					function ($byte) {
						return $byte ^ 0xFF;
					},
					\array_slice($bytes, -4)
				)
			);
		}
		if (self::subnet("::/96")->contains($address)
			&& !self::subnet("::/128")->contains($address)
			&& !self::subnet("::1/128")->contains($address)
		) {
			return IPv4::fromBytes(\array_slice($bytes, -4));
		}

		return null;
	}

	/**
	 * Parse a range, keeping the result for later calls
	 *
	 * @param string $cidr - range in CIDR notation
	 *
	 * @return \IPLib\Range\Subnet|null
	 */
	private static function subnet($cidr) {
		if (!\array_key_exists($cidr, self::$subnets)) {
			self::$subnets[$cidr] = Subnet::parseString($cidr);
		}

		return self::$subnets[$cidr];
	}
}
