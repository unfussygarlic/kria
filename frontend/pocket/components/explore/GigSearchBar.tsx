/**
 * GigSearchBar — shared search input for gigs + events.
 *
 * Used inline on Home (typing pans to top + reveals results in-place)
 * and on the /search "browse all" page (paired with FilterSheet + sort).
 * Same visual pattern in both to avoid two different-looking search UIs.
 */

import { forwardRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rf, rw } from "@/constants/responsive";

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Optional filter/sliders button on the right (used by /search). */
  showFilter?: boolean;
  onFilterPress?: () => void;
  filterBadgeCount?: number;
}

export const GigSearchBar = forwardRef<TextInput, Props>(function GigSearchBar(
  {
    value,
    onChangeText,
    onFocus,
    onBlur,
    onClear,
    placeholder = "Search gigs, events, roles…",
    autoFocus,
    showFilter,
    onFilterPress,
    filterBadgeCount = 0,
  },
  ref,
) {
  const handleClear = () => {
    onChangeText("");
    onClear?.();
  };

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <View style={styles.iconWrap}>
          <Feather name="search" size={rw(16)} color={T.text} />
        </View>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={T.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={autoFocus}
        />
        {value.length > 0 && (
          <Pressable hitSlop={10} onPress={handleClear}>
            <Feather name="x" size={rw(16)} color={T.textMuted} />
          </Pressable>
        )}
      </View>

      {showFilter && (
        <Pressable
          style={[styles.filterBtn, filterBadgeCount > 0 && styles.filterBtnActive]}
          onPress={onFilterPress}
        >
          <Feather
            name="sliders"
            size={rw(16)}
            color={filterBadgeCount > 0 ? T.selText : T.textSub}
          />
          {filterBadgeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterBadgeCount}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.md,
    backgroundColor: T.surface1,
    borderRadius: R.input,
    ...SHADOW.sm,
  },
  iconWrap: {
    width: rw(28),
    height: rw(28),
    borderRadius: R.chip,
    backgroundColor: T.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    ...TYPE.bodyLg,
    color: T.text,
    padding: 0,
  },
  filterBtn: {
    width: rw(48),
    height: rw(48),
    borderRadius: R.button,
    backgroundColor: T.surface1,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  filterBtnActive: {
    backgroundColor: T.selBg,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: T.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    ...TYPE.label,
    fontSize: rf(10),
    color: T.selText,
  },
});
