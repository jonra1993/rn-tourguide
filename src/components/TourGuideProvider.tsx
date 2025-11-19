import mitt, { Emitter } from 'mitt'
import * as React from 'react'
import { Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { TourGuideContext, Ctx } from './TourGuideContext'
import { useIsMounted } from '../hooks/useIsMounted'
import { IStep, Labels, StepObject, Steps } from '../types'
import * as utils from '../utilities'
import { Modal } from './Modal'
import { OFFSET_WIDTH } from './style'
import { TooltipProps } from './Tooltip'

const { useMemo, useEffect, useState, useRef } = React
/*
This is the maximum wait time for the steps to be registered before starting the tutorial
At 60fps means 2 seconds
*/
const MAX_START_TRIES = 120

export interface TourGuideProviderProps {
  tooltipComponent?: React.ComponentType<TooltipProps>
  tooltipStyle?: StyleProp<ViewStyle>
  labels?: Labels
  androidStatusBarVisible?: boolean
  startAtMount?: string | boolean
  backdropColor?: string
  verticalOffset?: number
  wrapperStyle?: StyleProp<ViewStyle>
  maskOffset?: number
  borderRadius?: number
  animationDuration?: number
  children: React.ReactNode
  dismissOnPress?: boolean
  preventOutsideInteraction?: boolean
}

export const TourGuideProvider = ({
  children,
  wrapperStyle,
  labels,
  tooltipComponent,
  tooltipStyle,
  androidStatusBarVisible,
  backdropColor,
  animationDuration,
  maskOffset,
  borderRadius,
  verticalOffset,
  startAtMount = false,
  dismissOnPress = false,
  preventOutsideInteraction = false,
}: TourGuideProviderProps) => {
  const [visible, updateVisible] = useState<Ctx<boolean | undefined>>({
    _default: false,
  })
  const setVisible = (key: string, value: boolean) =>
    updateVisible((visible: Ctx<boolean | undefined>) => {
      const newVisible = { ...visible }
      newVisible[key] = value
      return newVisible
    })
  const [currentStep, updateCurrentStep] = useState<Ctx<IStep | undefined>>({
    _default: undefined,
  })
  const [steps, setSteps] = useState<Ctx<Steps>>({ _default: [] })

  const [canStart, setCanStart] = useState<Ctx<boolean>>({ _default: false })

  const startTries = useRef<number>(0)
  const { current: mounted } = useIsMounted()

  const { current: eventEmitter } = useRef<Ctx<Emitter>>({
    _default: new mitt(),
  })

  const modalRefs = useRef<Record<string, any>>({})

  useEffect(() => {
    if (mounted) {
      Object.keys(visible).forEach((key) => {
        if (visible[key] === false && eventEmitter[key]) {
          eventEmitter[key]?.emit('stop')
        }
      })
    }
  }, [visible])

  useEffect(() => {
    Object.keys(visible).forEach((key) => {
      if (visible[key] || currentStep[key]) {
        moveToCurrentStep(key)
      }
    })
  }, [visible, currentStep])

  useEffect(() => {
    if (mounted) {
      Object.keys(steps).forEach((key) => {
        if (steps[key]) {
          if (
            (Array.isArray(steps[key]) && steps[key].length > 0) ||
            Object.entries(steps[key]).length > 0
          ) {
            setCanStart((obj: Ctx<boolean>) => {
              const newObj = { ...obj }
              newObj[key] = true
              return newObj
            })
            if (typeof startAtMount === 'string' && startAtMount === key) {
              start(startAtMount)
            } else if (startAtMount === true && key === '_default') {
              start('_default')
            }
          } else {
            setCanStart((obj: Ctx<boolean>) => {
              const newObj = { ...obj }
              newObj[key] = false
              return newObj
            })
          }
        }
      })
    }
  }, [mounted, steps])

  const moveToCurrentStep = async (key: string) => {
    const size = await currentStep[key]?.target.measure()
    if (
      size === undefined ||
      isNaN(size.width) ||
      isNaN(size.height) ||
      isNaN(size.x) ||
      isNaN(size.y)
    ) {
      return
    }
    await modalRefs.current[key]?.animateMove({
      width: size.width + OFFSET_WIDTH,
      height: size.height + OFFSET_WIDTH,
      left: Math.round(size.x) - OFFSET_WIDTH / 2,
      top: Math.round(size.y) - OFFSET_WIDTH / 2 + (verticalOffset || 0),
    })
  }

  const setCurrentStep = (key: string, step?: IStep) =>
    new Promise<void>((resolve) => {
      updateCurrentStep((currentStep: Ctx<IStep | undefined>) => {
        const newStep = { ...currentStep }
        newStep[key] = step
        eventEmitter[key]?.emit('stepChange', step)
        return newStep
      })
      resolve()
    })

  const getNextStep = (
    key: string,
    step: IStep | undefined = currentStep[key],
  ) => utils.getNextStep(steps[key]!, step)

  const getPrevStep = (
    key: string,
    step: IStep | undefined = currentStep[key],
  ) => utils.getPrevStep(steps[key]!, step)

  const getFirstStep = (key: string) => utils.getFirstStep(steps[key]!)

  const getLastStep = (key: string) => utils.getLastStep(steps[key]!)

  const isFirstStep = useMemo(() => {
    const obj: Ctx<boolean> = {} as Ctx<boolean>
    Object.keys(currentStep).forEach((key) => {
      obj[key] = currentStep[key] === getFirstStep(key)
    })
    return obj
  }, [currentStep])

  const isLastStep = useMemo(() => {
    const obj: Ctx<boolean> = {} as Ctx<boolean>
    Object.keys(currentStep).forEach((key) => {
      obj[key] = currentStep[key] === getLastStep(key)
    })
    return obj
  }, [currentStep])

  const _next = (key: string) => setCurrentStep(key, getNextStep(key)!)

  const _prev = (key: string) => setCurrentStep(key, getPrevStep(key)!)

  const _stop = (key: string) => {
    setVisible(key, false)
    setCurrentStep(key, undefined)
  }

  // Memoize navigation functions per tour key to prevent unnecessary re-renders
  const tourNavigationFunctions = useMemo(() => {
    const functions: Record<
      string,
      {
        next: () => Promise<void>
        prev: () => Promise<void>
        stop: () => void
      }
    > = {}

    Object.keys({ ...visible, ...currentStep, ...steps }).forEach((key) => {
      functions[key] = {
        next: () => _next(key),
        prev: () => _prev(key),
        stop: () => _stop(key),
      }
    })

    return functions
  }, [visible, currentStep, steps])

  const registerStep = (key: string, step: IStep) => {
    setSteps((previousSteps: Ctx<Steps>) => {
      const newSteps = { ...previousSteps }
      newSteps[key] = {
        ...previousSteps[key],
        [step.name]: step,
      }
      return newSteps
    })
    if (!eventEmitter[key]) {
      eventEmitter[key] = new mitt()
    }
  }

  const unregisterStep = (key: string, stepName: string) => {
    if (!mounted) {
      return
    }
    setSteps((previousSteps: Ctx<Steps>) => {
      const newSteps = { ...previousSteps }
      newSteps[key] = Object.entries(previousSteps[key] as StepObject)
        .filter(([key]) => key !== stepName)
        .reduce((obj, [key, val]) => Object.assign(obj, { [key]: val }), {})
      return newSteps
    })
  }

  const getCurrentStep = (key: string) => currentStep[key]

  const start = async (key: string, fromStep?: number) => {
    const currentStep = fromStep
      ? (steps[key] as StepObject)[fromStep]
      : getFirstStep(key)

    if (startTries.current > MAX_START_TRIES) {
      startTries.current = 0
      return
    }
    if (!currentStep) {
      startTries.current += 1
      requestAnimationFrame(() => start(key, fromStep))
    } else {
      eventEmitter[key]?.emit('start')
      await setCurrentStep(key, currentStep!)
      setVisible(key, true)
      startTries.current = 0
    }
  }

  return (
    <View style={[styles.container, wrapperStyle]}>
      <TourGuideContext.Provider
        value={{
          eventEmitter,
          registerStep,
          unregisterStep,
          getCurrentStep,
          start,
          stop,
          canStart,
        }}
      >
        {children}
        {Object.keys(visible)
          .filter((key) => visible[key] === true)
          .map((key) => {
            const navFuncs = tourNavigationFunctions[key] || {
              next: () => _next(key),
              prev: () => _prev(key),
              stop: () => _stop(key),
            }

            return (
              <Modal
                key={key}
                ref={(ref: any) => {
                  if (ref) {
                    modalRefs.current[key] = ref
                  }
                }}
                next={navFuncs.next}
                prev={navFuncs.prev}
                stop={navFuncs.stop}
                visible={visible[key]}
                isFirstStep={isFirstStep[key]}
                isLastStep={isLastStep[key]}
                currentStep={currentStep[key]}
                labels={labels ?? {}}
                tooltipComponent={tooltipComponent as any}
                tooltipStyle={tooltipStyle}
                androidStatusBarVisible={androidStatusBarVisible ?? false}
                backdropColor={backdropColor ?? 'rgba(0, 0, 0, 0.4)'}
                easing={Easing.elastic(0.7)}
                animationDuration={animationDuration}
                maskOffset={maskOffset}
                borderRadius={borderRadius}
                dismissOnPress={dismissOnPress}
                preventOutsideInteraction={preventOutsideInteraction}
              />
            )
          })}
      </TourGuideContext.Provider>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
