import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGigStore } from "@/stores/gigStore";
import { T } from "@/constants/colors";
import { GigCategories } from "@/constants/config";
import { GigCard } from "@/components/gig/GigCard";
import { GigCategory } from "@/types/database";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GigCategory | null>(
    null
  );

  const { gigs, setFilters } = useGigStore();

  const handleCategoryPress = (category: GigCategory) => {
    const newCategory = selectedCategory === category ? null : category;
    setSelectedCategory(newCategory);
    setFilters({ category: newCategory || undefined });
  };

  const filteredGigs = gigs.filter((gig) =>
    gig.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Gigs</Text>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={T.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gigs..."
            placeholderTextColor={T.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={T.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {GigCategories.map((cat) => (
          <Pressable
            key={cat.value}
            style={[
              styles.categoryChip,
              selectedCategory === cat.value && styles.categoryChipActive,
            ]}
            onPress={() => handleCategoryPress(cat.value as GigCategory)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.value && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Results */}
      <FlatList
        data={filteredGigs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GigCard
            gig={item}
            onPress={() => router.push(`/(main)/gig/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={48} color={T.textMuted} />
            <Text style={styles.emptyText}>No gigs found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or search query
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: T.surface,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: T.text,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: T.text,
  },
  categoryScroll: {
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: T.primary100,
    borderColor: T.primary,
  },
  categoryText: {
    fontSize: 14,
    color: T.textSub,
  },
  categoryTextActive: {
    color: T.primary,
    fontWeight: "600",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: T.textSub,
  },
  emptySubtext: {
    fontSize: 14,
    color: T.textMuted,
  },
});
