<?php

namespace App\Support;

/**
 * Drops geographic outliers (a UC geocoded to the wrong coordinate entirely) before
 * they reach a map visualization. Uses the standard Tukey 1.5×IQR fence on lat and
 * lng independently — lenient enough that real edge-of-region points survive, but
 * catches a coordinate that's off by an order of magnitude. Generic on purpose: it
 * makes no assumption about which region is being plotted, so it works the same way
 * whether the input is all of Punjab or a single tehsil.
 */
class GeoBounds
{
    public static function filterOutliers(array $items, callable $lat, callable $lng): array
    {
        if (count($items) < 8) {
            return $items;
        }

        [$latMin, $latMax] = self::fence(array_map($lat, $items));
        [$lngMin, $lngMax] = self::fence(array_map($lng, $items));

        return array_values(array_filter($items, function ($item) use ($lat, $lng, $latMin, $latMax, $lngMin, $lngMax) {
            $la = $lat($item);
            $ln = $lng($item);

            return $la >= $latMin && $la <= $latMax && $ln >= $lngMin && $ln <= $lngMax;
        }));
    }

    protected static function fence(array $values): array
    {
        sort($values);
        $n = count($values);
        $q1 = $values[(int) floor($n * 0.25)];
        $q3 = $values[(int) floor(($n - 1) * 0.75)];
        $iqr = $q3 - $q1;

        return [$q1 - 1.5 * $iqr, $q3 + 1.5 * $iqr];
    }
}
