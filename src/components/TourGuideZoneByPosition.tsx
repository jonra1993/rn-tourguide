import * as React from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { BorderRadiusObject, Shape } from '../types'
import { TourGuideZone } from './TourGuideZone'

export interface TourGuideZoneByPositionProps {
  zone: number
  tourKey?: string
  isTourGuide?: boolean
  top?: number | string
  left?: number | string
  right?: number | string
  bottom?: number | string
  width?: number | string
  height?: number | string
  shape?: Shape
  borderRadiusObject?: BorderRadiusObject
  focusStyle?: StyleProp<ViewStyle>
  containerStyle?: StyleProp<ViewStyle>
  keepTooltipPosition?: boolean
  tooltipBottomOffset?: number
  text?: string
}

export const TourGuideZoneByPosition = ({
  isTourGuide,
  zone,
  tourKey = '_default',
  width,
  height,
  top,
  left,
  right,
  bottom,
  shape,
  containerStyle,
  keepTooltipPosition,
  tooltipBottomOffset,
  borderRadiusObject,
  focusStyle,
  text,
}: TourGuideZoneByPositionProps) => {
  if (!isTourGuide) {
    return null
  }

  return (
    <View
      pointerEvents='none'
      style={[StyleSheet.absoluteFillObject, containerStyle]}
    >
      <TourGuideZone
        isTourGuide
        {...{
          tourKey,
          zone,
          shape,
          keepTooltipPosition,
          tooltipBottomOffset,
          borderRadiusObject,
          focusStyle,
          text,
        }}
        style={{
          position: 'absolute',
          height,
          width,
          top,
          right,
          bottom,
          left,
        }}
      >
        <View style={{ width: '100%', height: '100%' }} />
      </TourGuideZone>
    </View>
  )
}
