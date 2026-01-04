import { useLocation } from 'react-router-dom'

export default function ErrorPage() {
  const { pathname } = useLocation()
  return (
    <div className='text-center pt-10 font-sans dark:text-white'>
      <div className='flex justify-center'>
        <div className='i-ph-smiley-sad text-5xl text-gray-400' />
      </div>
      <h1 className='text-3xl font-bold mt-4'>Oooops!</h1>
      <div className='text-xl mt-10'>Sorry, there is something wrong...</div>
      <p className='mt-10'>
        <i className='text-gray-500 dark:text-gray-400'>{`404 not found: ${pathname}`}</i>
      </p>
    </div>
  )
}
