import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { useTheme } from '../utils/ThemeContext';

const AddNoteScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { note } = route.params || {};
  const isEditing = !!note;

  const [type, setType] = useState(isEditing ? note.type : 'regular');
  const [title, setTitle] = useState(isEditing ? note.title : '');
  const [date, setDate] = useState(isEditing && note.date ? new Date(note.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Regular Note State
  const [content, setContent] = useState(isEditing && note.regularData ? note.regularData.content : '');

  // Wages Note State
  const [people, setPeople] = useState(
    isEditing && note.wagesData && note.wagesData.people ? note.wagesData.people : []
  );
  const [foodAmount, setFoodAmount] = useState(
    isEditing && note.wagesData && note.wagesData.foodAmount ? note.wagesData.foodAmount.toString() : ''
  );
  const [other, setOther] = useState(
    isEditing && note.wagesData && note.wagesData.other ? note.wagesData.other : []
  );

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setLoading(true);

    const payload = {
      title,
      type,
      date,
    };

    if (type === 'regular') {
      payload.regularData = { content };
    } else {
      payload.wagesData = {
        people: people.map(p => ({ ...p, money: Number(p.money) || 0 })),
        foodAmount: Number(foodAmount) || 0,
        other: other.map(o => ({ ...o, money: Number(o.money) || 0 })),
      };
    }

    try {
      if (isEditing) {
        await api.put(`/notes/${note._id}`, payload);
      } else {
        await api.post('/notes', payload);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const addPerson = () => setPeople([...people, { name: '', money: '' }]);
  const updatePerson = (index, key, value) => {
    const updated = [...people];
    updated[index][key] = value;
    setPeople(updated);
  };
  const removePerson = (index) => {
    const updated = [...people];
    updated.splice(index, 1);
    setPeople(updated);
  };

  const addOther = () => setOther([...other, { type: '', money: '' }]);
  const updateOther = (index, key, value) => {
    const updated = [...other];
    updated[index][key] = value;
    setOther(updated);
  };
  const removeOther = (index) => {
    const updated = [...other];
    updated.splice(index, 1);
    setOther(updated);
  };

  // Calculate total for wages dynamically
  const calculateTotal = () => {
    const peopleSum = people.reduce((acc, curr) => acc + (Number(curr.money) || 0), 0);
    const otherSum = other.reduce((acc, curr) => acc + (Number(curr.money) || 0), 0);
    return peopleSum + (Number(foodAmount) || 0) + otherSum;
  };

  const noteTypeOptions = [
    { label: 'Regular Note', value: 'regular', icon: 'ℹ️', desc: 'Simple text-based note' },
    { label: 'Wages Note', value: 'wages', icon: '⚠️', desc: 'Track people, food & expenses' },
  ];

  const renderTypeSelector = () => {
    if (isEditing) return null;

    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Note Type</Text>
        <TouchableOpacity
          style={[styles.typeSelectorBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() => setShowTypeModal(true)}
        >
          <View style={styles.typeSelectorContent}>
            <Text style={styles.typeSelectorIcon}>
              {type === 'regular' ? 'ℹ️' : '⚠️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.typeSelectorLabel, { color: colors.textPrimary }]}>
                {type === 'regular' ? 'Regular Note' : 'Wages Note'}
              </Text>
              <Text style={[styles.typeSelectorDesc, { color: colors.textMuted }]}>
                {type === 'regular' ? 'Simple text-based note' : 'Track people, food & expenses'}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>▼</Text>
          </View>
        </TouchableOpacity>

        {/* Type Selection Modal (Popup Dialog) */}
        <Modal
          visible={showTypeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTypeModal(false)}
        >
          <TouchableOpacity
            style={[styles.typeModalOverlay, { backgroundColor: colors.overlay }]}
            activeOpacity={1}
            onPress={() => setShowTypeModal(false)}
          >
            <View style={[styles.typeModalContainer, { backgroundColor: colors.modalBg, borderColor: colors.borderAccent }]}>
              <Text style={[styles.typeModalTitle, { color: colors.textPrimary }]}>Select Note Type</Text>
              <Text style={[styles.typeModalSubtitle, { color: colors.textMuted }]}>Choose the type of note you want to create</Text>

              {noteTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.typeOption,
                    { borderColor: type === option.value ? colors.primary : colors.border, backgroundColor: type === option.value ? colors.primaryBg : 'transparent' },
                  ]}
                  onPress={() => {
                    setType(option.value);
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={styles.typeOptionIcon}>{option.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeOptionLabel, { color: colors.textPrimary }]}>{option.label}</Text>
                    <Text style={[styles.typeOptionDesc, { color: colors.textMuted }]}>{option.desc}</Text>
                  </View>
                  {type === option.value && (
                    <Text style={{ color: colors.primary, fontSize: 20 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.typeModalCloseBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowTypeModal(false)}
              >
                <Text style={[styles.typeModalCloseText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isEditing ? 'Edit Note' : 'New Note'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primaryLight} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primaryLight }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderTypeSelector()}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Enter title..."
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              style={{
                backgroundColor: colors.surfaceAlt,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '16px',
                color: colors.textPrimary,
                fontSize: '16px',
                width: '100%',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              value={date.toISOString().split('T')[0]}
              onChange={(e) => setDate(new Date(e.target.value))}
            />
          ) : (
            <>
              <TouchableOpacity style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: colors.textPrimary, fontSize: 16 }}>{date.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}
            </>
          )}
        </View>

        {type === 'regular' ? (
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Start writing..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />
          </View>
        ) : (
          <View style={styles.wagesContainer}>
            {/* People Section */}
            <View style={[styles.section, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>People</Text>
                <TouchableOpacity onPress={addPerson} style={[styles.addButton, { backgroundColor: colors.primaryBg }]}>
                  <Text style={[styles.addButtonText, { color: colors.primaryLight }]}>+ Add Person</Text>
                </TouchableOpacity>
              </View>
              {people.map((p, index) => (
                <View key={index} style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.flex2, styles.marginRight, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Name"
                    placeholderTextColor={colors.textMuted}
                    value={p.name}
                    onChangeText={(val) => updatePerson(index, 'name', val)}
                  />
                  <TextInput
                    style={[styles.input, styles.flex1, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Amount"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={p.money?.toString()}
                    onChangeText={(val) => updatePerson(index, 'money', val)}
                  />
                  <TouchableOpacity onPress={() => removePerson(index)} style={[styles.removeBtn, { backgroundColor: colors.dangerBg }]}>
                    <Text style={[styles.removeBtnText, { color: colors.dangerLight }]}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Food Section */}
            <View style={[styles.section, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Food Expenses</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Total Food Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={foodAmount}
                onChangeText={setFoodAmount}
              />
            </View>

            {/* Other Section */}
            <View style={[styles.section, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Other Expenses</Text>
                <TouchableOpacity onPress={addOther} style={[styles.addButton, { backgroundColor: colors.primaryBg }]}>
                  <Text style={[styles.addButtonText, { color: colors.primaryLight }]}>+ Add Expense</Text>
                </TouchableOpacity>
              </View>
              {other.map((o, index) => (
                <View key={index} style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.flex2, styles.marginRight, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Type (e.g., transport)"
                    placeholderTextColor={colors.textMuted}
                    value={o.type}
                    onChangeText={(val) => updateOther(index, 'type', val)}
                  />
                  <TextInput
                    style={[styles.input, styles.flex1, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Amount"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={o.money?.toString()}
                    onChangeText={(val) => updateOther(index, 'money', val)}
                  />
                  <TouchableOpacity onPress={() => removeOther(index)} style={[styles.removeBtn, { backgroundColor: colors.dangerBg }]}>
                    <Text style={[styles.removeBtnText, { color: colors.dangerLight }]}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={[styles.totalContainer, { borderColor: colors.borderAccent, backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Estimated:</Text>
              <Text style={[styles.totalAmount, { color: colors.primaryLight }]}>₹{calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
  },
  saveText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  // Type Selector Button (replaces Picker)
  typeSelectorBtn: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  typeSelectorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeSelectorDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  // Type Modal (Popup Dialog)
  typeModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  typeModalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  typeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  typeModalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  typeOptionIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  typeOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  typeModalCloseBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  typeModalCloseText: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 200,
  },
  wagesContainer: {
    marginTop: 10,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  flex2: {
    flex: 2,
  },
  flex1: {
    flex: 1,
  },
  marginRight: {
    marginRight: 8,
  },
  removeBtn: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 8,
  },
  removeBtnText: {
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 40,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default AddNoteScreen;
