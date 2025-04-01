/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {
  StartTransitionOptions,
  GestureProvider,
  GestureOptions,
} from 'shared/ReactTypes';

import ReactSharedInternals from 'shared/ReactSharedInternals';

import {
  enableTransitionTracing,
  enableSwipeTransition,
} from 'shared/ReactFeatureFlags';

import reportGlobalError from 'shared/reportGlobalError';

export type Transition = {
  gesture: null | GestureProvider, // enableSwipeTransition
  name: null | string, // enableTransitionTracing only
  startTime: number, // enableTransitionTracing only
  _updatedFibers: Set<Fiber>, // DEV-only
  ...
};

export function startTransition(
  scope: () => void,
  options?: StartTransitionOptions,
): void {
  const prevTransition = ReactSharedInternals.T;
  const currentTransition: Transition = ({}: any);
  if (enableSwipeTransition) {
    currentTransition.gesture = null;
  }
  if (enableTransitionTracing) {
    currentTransition.name =
      options !== undefined && options.name !== undefined ? options.name : null;
    currentTransition.startTime = -1; // TODO: This should read the timestamp.
  }
  if (__DEV__) {
    currentTransition._updatedFibers = new Set();
  }
  ReactSharedInternals.T = currentTransition;

  try {
    const returnValue = scope();
    const onStartTransitionFinish = ReactSharedInternals.S;
    if (onStartTransitionFinish !== null) {
      onStartTransitionFinish(currentTransition, returnValue);
    }
    if (
      typeof returnValue === 'object' &&
      returnValue !== null &&
      typeof returnValue.then === 'function'
    ) {
      returnValue.then(noop, reportGlobalError);
    }
  } catch (error) {
    reportGlobalError(error);
  } finally {
    warnAboutTransitionSubscriptions(prevTransition, currentTransition);
    ReactSharedInternals.T = prevTransition;
  }
}

export function startGestureTransition(
  provider: GestureProvider,
  scope: () => void,
  options?: GestureOptions & StartTransitionOptions,
): () => void {
  if (!enableSwipeTransition) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'startGestureTransition should not be exported when the enableSwipeTransition flag is off.',
    );
  }
  if (provider == null) {
    // We enforce this at runtime even though the type also enforces it since we
    // use null as a signal internally so it would lead it to be treated as a
    // regular transition otherwise.
    throw new Error(
      'A Timeline is required as the first argument to startGestureTransition.',
    );
  }
  const prevTransition = ReactSharedInternals.T;
  const currentTransition: Transition = ({}: any);
  if (enableSwipeTransition) {
    currentTransition.gesture = provider;
  }
  if (enableTransitionTracing) {
    currentTransition.name =
      options !== undefined && options.name !== undefined ? options.name : null;
    currentTransition.startTime = -1; // TODO: This should read the timestamp.
  }
  if (__DEV__) {
    currentTransition._updatedFibers = new Set();
  }
  ReactSharedInternals.T = currentTransition;

  try {
    const returnValue = scope();
    if (__DEV__) {
      if (
        typeof returnValue === 'object' &&
        returnValue !== null &&
        typeof returnValue.then === 'function'
      ) {
        console.error(
          'Cannot use an async function in startGestureTransition. It must be able to start immediately.',
        );
      }
    }
    const onStartGestureTransitionFinish = ReactSharedInternals.G;
    if (onStartGestureTransitionFinish !== null) {
      return onStartGestureTransitionFinish(
        currentTransition,
        provider,
        options,
      );
    }
  } catch (error) {
    reportGlobalError(error);
  } finally {
    ReactSharedInternals.T = prevTransition;
  }
  return function cancelGesture() {
    // Noop
  };
}

function warnAboutTransitionSubscriptions(
  prevTransition: Transition | null,
  currentTransition: Transition,
) {
  if (__DEV__) {
    if (prevTransition === null && currentTransition._updatedFibers) {
      const updatedFibersCount = currentTransition._updatedFibers.size;
      currentTransition._updatedFibers.clear();
      if (updatedFibersCount > 10) {
        console.warn(
          'Detected a large number of updates inside startTransition. ' +
            'If this is due to a subscription please re-write it to use React provided hooks. ' +
            'Otherwise concurrent mode guarantees are off the table.',
        );
      }
    }
  }
}

function noop() {}
