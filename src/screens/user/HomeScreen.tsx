import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MMKV } from 'react-native-mmkv';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const storage = new MMKV();
import { WheelModel } from '../../utils/types';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 2 - 24;

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { categories: storedCategories } = useAuth();

  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [wheels, setWheels] = useState<WheelModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisibleId, setLastVisibleId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterVisible, setFilterVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Build category list from fetched categories (fallback to stored if empty)
  const baseCategories = allCategories.length > 0 ? allCategories : (storedCategories || []);
  
  const categoryList = [
    { id: 'All', name: 'All' },
    ...baseCategories.filter((c: any) => c.isActive !== false),
  ];

  const fetchWheels = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setLoading(true);
        setLastVisibleId(null);
        setHasMore(true);
      }

      const params: any = {};
      if (!isRefresh && lastVisibleId) params.lastVisibleId = lastVisibleId;

      const response = await api.get('/models', { params });
      const data: WheelModel[] = response.data;

      if (isRefresh) {
        setWheels(data);
        // Cache the first page of results
        if (!searchQuery) {
          try {
            storage.set('@cached_wheels', JSON.stringify(data));
          } catch (err) {
            console.log('Cache save err:', err);
          }
        }
      } else {
        setWheels(prev => [...prev, ...data]);
      }

      // Track last visible ID for pagination
      if (data.length > 0) {
        setLastVisibleId(data[data.length - 1].id);
      }
      if (data.length < 10) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Fetch wheels error:', error);
    } finally {
      // Small delay on removing loading to prevent flash if cache was fast
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }, 300);
    }
  }, [searchQuery, lastVisibleId]);

  // Initial load
  useEffect(() => {
    const loadCacheThenFetch = () => {
      try {
        const cached = storage.getString('@cached_wheels');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            setWheels(parsed);
            setLoading(false); // Display cache immediately
          }
        }
      } catch (e) {
        console.log('Cache load err:', e);
      }
      // Always fetch fresh data on mount
      fetchWheels(true);
    };
    
    loadCacheThenFetch();
  }, []);

  // Fetch all categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setAllCategories(response.data);
      } catch (error) {
        console.error('Fetch categories error:', error);
        if (storedCategories) {
          setAllCategories(storedCategories);
        }
      }
    };

    fetchCategories();
  }, [storedCategories]);

  // Refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchWheels(true);
  };

  // Load more (lazy loading)
  const onEndReached = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      fetchWheels(false);
    }
  };

  // Apply filters
  const handleApplyFilter = () => {
    setFilterVisible(false);
  };

  const handleResetFilter = () => {
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setSearchQuery('');
  };

  const renderItem = ({ item }: { item: WheelModel }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, { backgroundColor: theme.card }]}
      onPress={() => navigation.navigate('ProductDetail', { item })}
    >
      <View
        style={[
          styles.imageContainer,
          { backgroundColor: isDarkMode ? '#334155' : '#fff' },
        ]}
      >
        {item.images?.[0] ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <MaterialCommunityIcons name="cube-outline" size={40} color="#9CA3AF" />
        )}
      </View>
      <View style={styles.cardContent}>
        <Text
          style={[styles.cardTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text style={styles.cardPrice}>
          ฿{Number(item.price)?.toLocaleString()}
        </Text>
        <Text style={styles.cardCategory}>{item.brand}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  };

  const displayedWheels = React.useMemo(() => {
    return wheels.filter(item => {
      let match = true;
      if (selectedCategory !== 'All') {
        const selectedCatObj = categoryList.find((c: any) => c.id === selectedCategory);
        if (selectedCatObj) {
          const lowerSelectedName = selectedCatObj.name.toLowerCase();
          const lowerSelectedId = selectedCategory.toLowerCase();
          const hasCategory = item.categories?.some((c: string) => {
            const lowerC = String(c).toLowerCase();
            return lowerC === lowerSelectedId || lowerC === lowerSelectedName;
          });
          if (!hasCategory) match = false;
        }
      }
      if (minPrice) {
        if (Number(item.price) < Number(minPrice)) match = false;
      }
      if (maxPrice) {
        if (Number(item.price) > Number(maxPrice)) match = false;
      }
      if (searchQuery) {
        const lowerSearch = searchQuery.toLowerCase();
        const lowerName = (item.name || '').toLowerCase();
        const lowerBrand = (item.brand || '').toLowerCase();
        if (!lowerName.includes(lowerSearch) && !lowerBrand.includes(lowerSearch)) {
          match = false;
        }
      }
      return match;
    });
  }, [wheels, selectedCategory, minPrice, maxPrice, categoryList, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={[styles.headerWrapper, { backgroundColor: theme.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.appName, { color: theme.text }]}>
            {t.app_name}
          </Text>
        </View>

        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' },
            ]}
          >
            <Icon
              name="magnify"
              size={24}
              color="#2563EB"
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder={t.search_placeholder}
              placeholderTextColor={theme.subText}
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => setFilterVisible(true)}
          >
            <Icon name="tune-variant" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={displayedWheels}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={[styles.listContent, { paddingBottom: 150, flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            onRefresh={onRefresh}
            refreshing={refreshing}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: 'center',
                marginTop: 50,
                color: theme.subText,
              }}
            >
              No wheels found.
            </Text>
          }
        />
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={isFilterVisible}
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setFilterVisible(false)}
        >
          {/* หุ้ม Container ด้วย TouchableOpacity อีกชั้น เพื่อไม่ให้การกดข้างใน Modal ทะลุไปปิด */}
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={e => e.stopPropagation()} 
            style={[
              styles.modalContainer,
              { backgroundColor: theme.background, maxHeight: '80%' },
            ]}
          >
            <Text style={[styles.filterTitle, { color: theme.text }]}>
              Filter
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={[styles.filterCard, { backgroundColor: theme.card }]}>

                {/* --- Categories Section --- */}
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                  Category
                </Text>
                <View style={styles.categoryWrap}>
                  {categoryList.map((cat: any) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setSelectedCategory(cat.id)}
                        style={[
                          styles.modalCatPill,
                          { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' },
                          isActive && styles.modalCatPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalCatText,
                            isActive && styles.modalCatTextActive,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* --- Price Range Section --- */}
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                  Price Range
                </Text>
                <View style={styles.priceRow}>
                  <View
                    style={[
                      styles.priceInputWrapper,
                      { borderColor: theme.border },
                    ]}
                  >
                    <TextInput
                      value={minPrice}
                      onChangeText={setMinPrice}
                      keyboardType="numeric"
                      style={[styles.priceInput, { color: theme.text }]}
                      placeholder="Min ฿"
                      placeholderTextColor={theme.subText}
                    />
                  </View>
                  <Text style={[styles.priceSeparator, { color: theme.subText }]}>
                    -
                  </Text>
                  <View
                    style={[
                      styles.priceInputWrapper,
                      { borderColor: theme.border },
                    ]}
                  >
                    <TextInput
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      keyboardType="numeric"
                      style={[styles.priceInput, { color: theme.text }]}
                      placeholder="Max ฿"
                      placeholderTextColor={theme.subText}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.clearOutlineButton, { borderColor: '#2563EB' }]}
                onPress={handleResetFilter}
                activeOpacity={0.8}
              >
                <Text style={[styles.clearOutlineText, { color: '#2563EB' }]}>
                  Clear All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.clearSolidButton,
                  { backgroundColor: '#2563EB' },
                ]}
                onPress={handleApplyFilter}
                activeOpacity={0.8}
              >
                <Text style={styles.clearSolidText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44,
    paddingBottom: 15,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  appName: { fontSize: 24, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 10,
  },
  searchInput: { flex: 1, fontSize: 16 },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  card: {
    width: COLUMN_WIDTH,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: '80%', height: '80%' },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  cardPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 2,
  },
  cardCategory: { fontSize: 11, color: '#94A3B8' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '88%',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  filterCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  filterSectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 12 
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  modalCatPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  modalCatPillActive: { backgroundColor: '#2563EB' },
  modalCatText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  modalCatTextActive: { color: '#fff' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInputWrapper: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  priceInput: { fontSize: 14 },
  priceSeparator: { marginHorizontal: 12, fontSize: 16, fontWeight: '600' },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  clearOutlineButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#E5EDFF',
  },
  clearOutlineText: { fontSize: 15, fontWeight: '600' },
  clearSolidButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  clearSolidText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default HomeScreen;
