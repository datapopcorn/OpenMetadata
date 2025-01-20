/*
 *  Copyright 2024 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { create } from 'zustand';
import { AuthenticationConfigurationWithScope } from '../components/Auth/AuthProviders/AuthProvider.interface';
import { EntityUnion } from '../components/Explore/ExplorePage.interface';
import { AuthenticationConfiguration } from '../generated/configuration/authenticationConfiguration';
import { AuthorizerConfiguration } from '../generated/configuration/authorizerConfiguration';
import { UIThemePreference } from '../generated/configuration/uiThemePreference';
import { User } from '../generated/entity/teams/user';
import { EntityReference } from '../generated/entity/type';
import {
  ApplicationStore,
  HelperFunctions,
} from '../interface/store.interface';
import { getOidcToken } from '../utils/LocalStorageUtils';
import { getThemeConfig } from '../utils/ThemeUtils';

export const OM_SESSION_KEY = 'om-session';

export const useApplicationStore = create<ApplicationStore>()((set, get) => ({
  isApplicationLoading: false,
  theme: getThemeConfig(),
  applicationConfig: {
    customTheme: getThemeConfig(),
  } as UIThemePreference,
  currentUser: undefined,
  newUser: undefined,
  isAuthenticated: Boolean(getOidcToken()),
  authConfig: undefined,
  authorizerConfig: undefined,
  isSigningUp: false,
  jwtPrincipalClaims: [],
  jwtPrincipalClaimsMapping: [],
  userProfilePics: {},
  cachedEntityData: {},
  selectedPersona: {} as EntityReference,
  searchCriteria: '',
  inlineAlertDetails: undefined,
  applications: [],
  appPreferences: {},

  setInlineAlertDetails: (inlineAlertDetails) => {
    set({ inlineAlertDetails });
  },

  setHelperFunctionsRef: (helperFunctions: HelperFunctions) => {
    set({ ...helperFunctions });
  },

  setSelectedPersona: (persona: EntityReference) => {
    set({ selectedPersona: persona });
  },

  setApplicationConfig: (config: UIThemePreference) => {
    set({ applicationConfig: config, theme: config.customTheme });
  },
  setCurrentUser: (user) => {
    set({ currentUser: user });
  },
  setAuthConfig: (authConfig: AuthenticationConfigurationWithScope) => {
    set({ authConfig });
  },
  setAuthorizerConfig: (authorizerConfig: AuthorizerConfiguration) => {
    set({ authorizerConfig });
  },
  setJwtPrincipalClaims: (
    claims: AuthenticationConfiguration['jwtPrincipalClaims']
  ) => {
    set({ jwtPrincipalClaims: claims });
  },
  setJwtPrincipalClaimsMapping: (
    claimMapping: AuthenticationConfiguration['jwtPrincipalClaimsMapping']
  ) => {
    set({ jwtPrincipalClaimsMapping: claimMapping });
  },
  setIsAuthenticated: (authenticated: boolean) => {
    set({ isAuthenticated: authenticated });
  },
  setIsSigningUp: (signingUp: boolean) => {
    set({ isSigningUp: signingUp });
  },

  setApplicationLoading: (loading: boolean) => {
    set({ isApplicationLoading: loading });
  },

  onLoginHandler: () => {
    // This is a placeholder function that will be replaced by the actual function
  },
  onLogoutHandler: () => {
    // This is a placeholder function that will be replaced by the actual function
  },

  handleSuccessfulLogin: () => {
    // This is a placeholder function that will be replaced by the actual function
  },
  handleFailedLogin: () => {
    // This is a placeholder function that will be replaced by the actual function
  },
  updateAxiosInterceptors: () => {
    // This is a placeholder function that will be replaced by the actual function
  },
  trySilentSignIn: (forceLogout?: boolean) => {
    if (forceLogout) {
      // This is a placeholder function that will be replaced by the actual function
    }
  },
  updateCurrentUser: (user) => {
    set({ currentUser: user });
  },
  updateUserProfilePics: ({ id, user }: { id: string; user: User }) => {
    set({
      userProfilePics: { ...get()?.userProfilePics, [id]: user },
    });
  },
  updateCachedEntityData: ({
    id,
    entityDetails,
  }: {
    id: string;
    entityDetails: EntityUnion;
  }) => {
    set({
      cachedEntityData: {
        ...get()?.cachedEntityData,
        [id]: entityDetails,
      },
    });
  },
  updateNewUser: (user) => {
    set({ newUser: user });
  },
  setAppPreferences: (
    preferences: Partial<ApplicationStore['appPreferences']>
  ) => {
    set((state) => ({
      appPreferences: {
        ...state.appPreferences,
        ...preferences,
      },
    }));
  },
  updateSearchCriteria: (criteria) => {
    set({ searchCriteria: criteria });
  },
  setApplicationsName: (applications: string[]) => {
    set({ applications: applications });
  },
}));
