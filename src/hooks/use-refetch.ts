import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

const useRefetch = () => {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.refetchQueries({
      type:"active"
    })
  }
}

export default useRefetch

// this hook to invalidate all trpc queries so that it automatically refetches all queries and make sure data is always updated

// when we call this function , it's going to refetch all active queries , so data always be updated
