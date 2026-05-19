import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client"
import { setContext } from "@apollo/client/link/context"
import { GraphQLWsLink } from "@apollo/client/link/subscriptions"
import { getMainDefinition } from "@apollo/client/utilities"
import Constants from "expo-constants"
import { createClient } from "graphql-ws"

export const createApolloClient = () => {
  console.log("GRAPHQL_URL:", Constants.expoConfig?.extra?.GRAPHQL_URL);
  console.log("WS_URL:", Constants.expoConfig?.extra?.WS_URL);
  const graphqlUrl = Constants.expoConfig?.extra?.GRAPHQL_URL
  const wsUrl = Constants.expoConfig?.extra?.WS_URL

  const cache = new InMemoryCache()

  if (!graphqlUrl) {
    throw new Error("The GraphQL URL is not defined.")
  }

  if (!wsUrl) {
    throw new Error("The WebSocket URL is not defined.")
  }

  // HTTP Link
  const httpLink = new HttpLink({
    uri: graphqlUrl,
  })

  // Auth link
  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
    },
  }))

  // WebSocket Link
  const wsLink = new GraphQLWsLink(
    createClient({
      url: wsUrl,
      connectionParams: {
        headers: {},
      },
      keepAlive: 10000,
    })
  )

  // Split links: ws for subscriptions, http for queries/mutations
  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query)
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      )
    },
    wsLink,
    authLink.concat(httpLink)
  )

  return new ApolloClient({
    link: splitLink,
    cache,
  })
}
