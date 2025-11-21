import React, { useRef, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';

// 1. Sample Data
const DATA = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  name: `Employee ${i + 1}`,
  role: 'Software Engineer',
  email: `user${i + 1}@company.com`,
  phone: '555-0123',
  address: '123 Tech Blvd, Silicon Valley',
  status: 'Active',
}));

// 2. Configuration
const LEFT_COL_WIDTH = "w-32";
const ROW_HEIGHT = 60; // Fixed height is helpful for perfect alignment, but flex works too
const HEADER_HEIGHT = 50;

export default function PinnedColumnTable() {
  // Refs for syncing vertical scroll
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  
  // State to prevent infinite scroll loops (Left triggering Right triggering Left...)
  const [scrollingList, setScrollingList] = useState(null);

  // --- SYNC LOGIC ---
  const syncScrollOffset = (source, offset) => {
    const targetRef = source === 'left' ? rightRef : leftRef;
    if (scrollingList && scrollingList !== source) return;

    targetRef.current?.scrollToOffset({ offset, animated: false });
  };

  const handleScroll = (source, event) => {
    if (scrollingList && scrollingList !== source) return; // Ignore if triggered by the other list
    setScrollingList(source);
    syncScrollOffset(source, event.nativeEvent.contentOffset.y);
  };

  const handleScrollEnd = () => {
    setScrollingList(null);
  };

  // --- RENDER COMPONENTS ---

  const renderHeaderCell = (label, widthClass = "w-40") => (
    <View 
      className={`${widthClass} border-r border-b border-slate-300 bg-slate-100 justify-center p-4`}
      style={{ height: HEADER_HEIGHT }}
    >
      <Text className="font-bold text-slate-800">{label}</Text>
    </View>
  );

  const renderCell = (text, widthClass = "w-40", isEven) => (
    <View 
      className={`${widthClass} border-r border-b border-slate-200 justify-center p-4 ${isEven ? 'bg-white' : 'bg-slate-50'}`}
      style={{ height: ROW_HEIGHT }}
    >
      <Text className="text-slate-600" numberOfLines={1}>{text}</Text>
    </View>
  );

  // --- LEFT COLUMN (PINNED) ---
  const renderLeftItem = ({ item, index }) => (
    <View 
      className={`${LEFT_COL_WIDTH} border-r-2 border-b border-slate-200 border-r-slate-300 justify-center p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
      style={{ height: ROW_HEIGHT }}
    >
      <Text className="font-bold text-slate-800" numberOfLines={1}>{item.name}</Text>
    </View>
  );

  const renderLeftHeader = () => (
    <View 
      className={`${LEFT_COL_WIDTH} border-r-2 border-b border-slate-300 border-r-slate-300 bg-slate-100 justify-center p-4`}
      style={{ height: HEADER_HEIGHT }}
    >
      <Text className="font-bold text-slate-900">Name</Text>
    </View>
  );

  // --- RIGHT COLUMNS (SCROLLABLE) ---
  const renderRightItem = ({ item, index }) => {
    const isEven = index % 2 === 0;
    return (
      <View className="flex-row">
        {renderCell(item.role, "w-40", isEven)}
        {renderCell(item.email, "w-60", isEven)}
        {renderCell(item.phone, "w-32", isEven)}
        {renderCell(item.address, "w-64", isEven)}
        {renderCell(item.status, "w-24", isEven)}
      </View>
    );
  };

  const renderRightHeader = () => (
    <View className="flex-row">
      {renderHeaderCell('Role', "w-40")}
      {renderHeaderCell('Email', "w-60")}
      {renderHeaderCell('Phone', "w-32")}
      {renderHeaderCell('Address', "w-64")}
      {renderHeaderCell('Status', "w-24")}
    </View>
  );

  return (
    <View className="flex-1 bg-white pt-10 pb-5 px-2">
      <Text className="text-2xl font-bold text-slate-900 mb-4">Employee Directory</Text>
      
      <View className="flex-1 flex-row border border-slate-300 rounded-lg overflow-hidden">
        
        {/* 1. LEFT FIXED COLUMN */}
        {/* Uses shadow to appear "above" the scrolling content */}
        <View className="z-10 bg-white shadow-lg">
          <FlatList
            ref={leftRef}
            data={DATA}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLeftItem}
            ListHeaderComponent={renderLeftHeader}
            stickyHeaderIndices={[0]} // Freezes Vertical Header
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => handleScroll('left', e)}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
          />
        </View>

        {/* 2. RIGHT SCROLLABLE AREA */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <FlatList
            ref={rightRef}
            data={DATA}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRightItem}
            ListHeaderComponent={renderRightHeader}
            stickyHeaderIndices={[0]} // Freezes Vertical Header
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            onScroll={(e) => handleScroll('right', e)}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
          />
        </ScrollView>

      </View>
    </View>
  );
}