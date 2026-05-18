import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SelectDropdownProps {
  label: string;
  value: string | null;
  options: Option[];
  onSelect: (id: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({ 
  label, value, options, onSelect, placeholder = 'Seleccionar...', searchable = false, disabled = false 
}) => {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find(o => o.id === value);

  const filteredOptions = searchable && searchQuery
    ? options.filter(o => 
        o.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.subLabel?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleSelect = (id: string) => {
    onSelect(id);
    setVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity 
        style={[styles.selector, disabled && styles.disabledSelector]} 
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.selectorText, !selectedOption && styles.placeholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={disabled ? 'transparent' : colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {searchable && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          )}

          <ScrollView contentContainerStyle={styles.listContainer}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(item => (
                <TouchableOpacity key={item.id} style={styles.optionItem} onPress={() => handleSelect(item.id)}>
                  <View>
                    <Text style={[styles.optionLabel, value === item.id && styles.optionSelectedText]}>
                      {item.label}
                    </Text>
                    {item.subLabel && <Text style={styles.optionSubLabel}>{item.subLabel}</Text>}
                  </View>
                  {value === item.id && <Ionicons name="checkmark" size={24} color={colors.primary} />}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No hay resultados.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
  },
  disabledSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    opacity: 1,
  },
  selectorText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  optionSelectedText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  optionSubLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: colors.textSecondary,
    fontSize: 16,
  }
});
