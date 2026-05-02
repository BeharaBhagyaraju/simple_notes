import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import CustomPicker from '../components/CustomPicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../services/api';
import AvatarMenu from '../components/AvatarMenu';
import { useTheme } from '../utils/ThemeContext';

const HomeScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { onLogout } = route?.params || {};
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [tempFilters, setTempFilters] = useState([]);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const activeNameFilter = activeFilters.find(f => f.field === 'name')?.value || '';
  const activeFoodFilter = activeFilters.find(f => f.field === 'food');
  const activeOtherFilter = activeFilters.find(f => f.field === 'other')?.value || '';
  const isReportingMode = activeNameFilter || activeFoodFilter || activeOtherFilter;

  // Extract suggestions from currently loaded notes
  const uniqueNames = [...new Set(notes.flatMap(n => n.type === 'wages' && n.wagesData && n.wagesData.people ? n.wagesData.people.map(p => p.name) : []).filter(Boolean))];
  const uniqueOthers = [...new Set(notes.flatMap(n => n.type === 'wages' && n.wagesData && n.wagesData.other ? n.wagesData.other.map(o => o.type) : []).filter(Boolean))];

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (activeFilters.length > 0) {
        params.append('filters', JSON.stringify(activeFilters));
      }

      const response = await api.get(`/notes?${params.toString()}`);
      setNotes(response.data);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [debouncedSearch, activeFilters])
  );

  // Condition Builder Logic
  const addFilter = (logic = 'AND') => {
    setTempFilters([...tempFilters, { id: Date.now().toString(), field: 'name', operator: 'contains', value: '', logic }]);
  };

  const updateFilter = (id, key, value) => {
    setTempFilters(tempFilters.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeFilter = (id) => {
    setTempFilters(tempFilters.filter(f => f.id !== id));
  };

  // Parse entries for table view
  const getFilteredEntries = () => {
    if (!isReportingMode) return [];
    
    const entries = [];
    notes.forEach(note => {
      if (note.type === 'wages' && note.wagesData) {
        // Name
        if (activeNameFilter && note.wagesData.people) {
          note.wagesData.people.forEach(person => {
            if (person.name.toLowerCase().includes(activeNameFilter.toLowerCase())) {
              entries.push({
                id: `name-${note._id}-${person._id || Math.random()}`,
                name: person.name,
                money: person.money,
                date: new Date(note.date).toLocaleDateString(),
                noteTitle: note.title
              });
            }
          });
        }
        // Food
        if (activeFoodFilter && note.wagesData.foodAmount > 0) {
          entries.push({
            id: `food-${note._id}`,
            name: "Food",
            money: note.wagesData.foodAmount,
            date: new Date(note.date).toLocaleDateString(),
            noteTitle: note.title
          });
        }
        // Others
        if (activeOtherFilter && note.wagesData.other) {
          note.wagesData.other.forEach(otherItem => {
            if (otherItem.type.toLowerCase().includes(activeOtherFilter.toLowerCase())) {
              entries.push({
                id: `other-${note._id}-${Math.random()}`,
                name: `Other: ${otherItem.type}`,
                money: otherItem.money,
                date: new Date(note.date).toLocaleDateString(),
                noteTitle: note.title
              });
            }
          });
        }
      }
    });
    return entries;
  };

  const filteredEntries = getFilteredEntries();
  const totalFilteredAmount = filteredEntries.reduce((sum, item) => sum + Number(item.money), 0);

  const exportPdf = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica'; padding: 20px; }
              h1 { color: #1E293B; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #CBD5E1; padding: 12px; text-align: left; }
              th { background-color: #F1F5F9; font-weight: bold; color: #334155; }
              td { color: #475569; }
              .total { font-weight: bold; font-size: 18px; margin-top: 20px; text-align: right; color: #0F172A; }
            </style>
          </head>
          <body>
            <h1>Wage Report: ${activeNameFilter || activeOtherFilter || 'Food'}</h1>
            <table>
              <tr>
                <th>Date</th>
                <th>Note Title</th>
                <th>Name</th>
                <th>Amount</th>
              </tr>
              ${filteredEntries.map(entry => `
                <tr>
                  <td>${entry.date}</td>
                  <td>${entry.noteTitle}</td>
                  <td>${entry.name}</td>
                  <td>₹${entry.money}</td>
                </tr>
              `).join('')}
            </table>
            <div class="total">Total: ₹${totalFilteredAmount.toFixed(2)}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (Platform.OS === 'web') {
        Alert.alert('Success', 'PDF generated! Please use the native app to save to files directly.');
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const handleDelete = async (id) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this note?');
      if (confirmed) {
        try {
          await api.delete(`/notes/${id}`);
          fetchNotes();
        } catch (error) {
          window.alert('Failed to delete note');
        }
      }
    } else {
      Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/notes/${id}`);
              fetchNotes();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]);
    }
  };

  const renderNote = ({ item }) => {
    const isWages = item.type === 'wages';
    const date = new Date(item.date).toLocaleDateString();

    return (
      <TouchableOpacity
        style={[
          styles.noteCard, 
          { backgroundColor: colors.surface, borderColor: colors.border },
          isWages ? styles.wagesAlertCard : styles.regularAlertCard
        ]}
        onPress={() => navigation.navigate('AddNote', { note: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWrapper}>
            <Text style={styles.alertIcon}>{isWages ? '⚠️' : 'ℹ️'}</Text>
            <Text style={[styles.noteTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
            <Text style={[styles.deleteText, { color: colors.dangerLight }]}>Delete</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>📅 {date}</Text>
        </View>

        {isWages && item.wagesData && (
          <View style={[styles.totalWrapper, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalText, { color: colors.primaryLight }]}>Total Estimate: ₹{item.wagesData.totalAmount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Notes</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Manage your tasks & wages</Text>
        </View>
        <AvatarMenu navigation={navigation} onLogout={onLogout} />
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity 
          style={[styles.filterBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]} 
          onPress={() => {
            setTempFilters(activeFilters);
            setFilterModalVisible(true);
          }}
        >
          <Text style={styles.filterIcon}>{activeFilters.length > 0 ? '🟢' : '🔍'}</Text>
        </TouchableOpacity>
      </View>

      {isReportingMode && (
        <View style={styles.activeFiltersBar}>
          <TouchableOpacity onPress={() => { setActiveFilters([]); setTempFilters([]); }} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Notes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContentFullscreen, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Condition Builder</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={[styles.closeModalText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.builderScroll}>
              {tempFilters.map((f, index) => (
                <View key={f.id} style={styles.filterRowContainer}>
                  {index > 0 && <Text style={[styles.andText, { color: colors.primary }]}>{f.logic || 'AND'}</Text>}
                  <View style={[styles.filterRow, { backgroundColor: colors.filterRow, borderColor: colors.border }]}>
                    <CustomPicker
                      selectedValue={f.field}
                      onValueChange={(val) => updateFilter(f.id, 'field', val)}
                      options={[
                        { label: 'Name (Wages)', value: 'name' },
                        { label: 'Date', value: 'date' },
                        { label: 'Note Type', value: 'type' },
                        { label: 'Food Expenses', value: 'food' },
                        { label: 'Other Expenses', value: 'other' },
                      ]}
                    />
                    <CustomPicker
                      selectedValue={f.operator}
                      onValueChange={(val) => updateFilter(f.id, 'operator', val)}
                      options={
                        f.field === 'name' || f.field === 'other'
                          ? [{ label: 'contains', value: 'contains' }, { label: 'is', value: 'is' }]
                          : f.field === 'type'
                          ? [{ label: 'is', value: 'is' }]
                          : f.field === 'food'
                          ? [{ label: 'has expenses', value: 'has' }]
                          : [{ label: 'is', value: 'is' }, { label: 'after', value: 'after' }, { label: 'before', value: 'before' }]
                      }
                    />
                    {f.field === 'type' ? (
                      <CustomPicker
                        selectedValue={f.value}
                        onValueChange={(val) => updateFilter(f.id, 'value', val)}
                        options={[
                          { label: 'Select...', value: '' },
                          { label: 'Regular', value: 'regular' },
                          { label: 'Wages', value: 'wages' },
                        ]}
                        style={{ borderLeftWidth: 1, borderLeftColor: colors.border }}
                      />
                    ) : f.field === 'food' ? (
                      <View style={[styles.builderInput, { justifyContent: 'center' }]}>
                        <Text style={{ color: colors.textSecondary }}>{'>'} 0</Text>
                      </View>
                    ) : (
                      <TextInput
                        style={[styles.builderInput, { color: colors.textPrimary }]}
                        placeholder={f.field === 'date' ? "YYYY-MM-DD" : "Value"}
                        placeholderTextColor={colors.textMuted}
                        value={f.value}
                        onChangeText={(val) => updateFilter(f.id, 'value', val)}
                      />
                    )}
                    <TouchableOpacity onPress={() => removeFilter(f.id)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Suggestions Row */}
                  {f.field === 'name' && uniqueNames.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                      {uniqueNames.map(name => (
                        <TouchableOpacity key={name} style={styles.suggestionChip} onPress={() => updateFilter(f.id, 'value', name)}>
                          <Text style={styles.suggestionText}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {f.field === 'other' && uniqueOthers.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                      {uniqueOthers.map(type => (
                        <TouchableOpacity key={type} style={styles.suggestionChip} onPress={() => updateFilter(f.id, 'value', type)}>
                          <Text style={styles.suggestionText}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))}

              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
                <TouchableOpacity style={[styles.addConditionBtn, {flex: 1, marginRight: 5}]} onPress={() => addFilter('AND')}>
                  <Text style={styles.addConditionText}>+ Add AND</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addConditionBtn, {flex: 1, marginLeft: 5}]} onPress={() => addFilter('OR')}>
                  <Text style={styles.addConditionText}>+ Add OR</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearBtn} 
                onPress={() => {
                  setTempFilters([]);
                  setActiveFilters([]);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyBtn} 
                onPress={() => {
                  setActiveFilters(tempFilters);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.applyText}>Apply Conditions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#818CF8" />
        </View>
      ) : isReportingMode ? (
        // Table View for Filtered Wages Data
        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Date</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Note</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Name</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
          </View>
          <FlatList
            data={filteredEntries}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.date}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>{item.noteTitle}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>₹{item.money}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={styles.emptyText}>No entries found.</Text>
              </View>
            }
          />
          <View style={styles.tableFooter}>
            <Text style={styles.tableFooterText}>Total: ₹{totalFilteredAmount.toFixed(2)}</Text>
            <TouchableOpacity style={styles.exportBtn} onPress={exportPdf}>
              <Text style={styles.exportBtnText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyEmoji}>📝</Text>
          <Text style={styles.emptyText}>No notes found</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item._id}
          renderItem={renderNote}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      {!isReportingMode && !isFilterModalVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddNote')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  logoutText: {
    color: '#FCA5A5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  emptySubText: {
    color: '#64748B',
    marginTop: 8,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100, // padding for FAB
  },
  noteCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  regularAlertCard: {
    borderLeftColor: '#34D399',
  },
  wagesAlertCard: {
    borderLeftColor: '#FBBF24',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 10,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  regularBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
  },
  regularBadgeText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: 'bold',
  },
  wagesBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
  },
  wagesBadgeText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  totalWrapper: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  totalText: {
    color: '#818CF8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    marginRight: 10,
  },
  filterBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 18,
  },
  activeFiltersBar: {
    paddingHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
  },
  backButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  backButtonText: {
    color: '#FCA5A5',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  closeModalText: {
    fontSize: 24,
    color: '#94A3B8',
  },
  modalContentFullscreen: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    flex: 0.9, // Takes up 90% of screen
  },
  builderScroll: {
    flex: 1,
    marginBottom: 20,
  },
  filterRowContainer: {
    marginBottom: 16,
  },
  andText: {
    color: '#6366F1',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  pickerContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  picker: {
    color: '#F8FAFC',
    height: 40,
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...(Platform.OS === 'web' && {
      outline: 'none',
      cursor: 'pointer',
    }),
  },
  builderInput: {
    flex: 1,
    height: 40,
    color: '#F8FAFC',
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(51, 65, 85, 0.5)',
  },
  removeBtn: {
    padding: 8,
    marginLeft: 4,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: 8,
  },
  removeBtnText: {
    color: '#FCA5A5',
    fontWeight: 'bold',
  },
  addConditionBtn: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addConditionText: {
    color: '#818CF8',
    fontWeight: 'bold',
  },
  suggestionsScroll: {
    marginTop: 8,
    flexDirection: 'row',
  },
  suggestionChip: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  suggestionText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    marginRight: 10,
    alignItems: 'center',
  },
  clearText: {
    color: '#FCA5A5',
    fontWeight: 'bold',
    fontSize: 16,
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    marginLeft: 10,
    alignItems: 'center',
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingTop: 16,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.8)',
  },
  tableHeaderCell: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.4)',
  },
  tableCell: {
    color: '#F8FAFC',
    fontSize: 15,
  },
  tableFooter: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.8)',
  },
  tableFooterText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exportBtn: {
    backgroundColor: '#34D399',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#064E3B',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default HomeScreen;
