type SearchParams = Promise<{ name?: string }>

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { name = 'User' } = await searchParams

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-6">
      <div className="w-20 h-20">
        <img src="/icon.svg" alt="NeuronMap" className="w-full h-full" />
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-3">恭喜登录成功！</h1>
        <p className="text-lg text-zinc-400">
          Welcome to NeuronMap,{' '}
          <span className="font-semibold text-violet-400">{name}</span>
        </p>
      </div>
      <div className="mt-4 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-500">
        后端 API 验证通过 · 数据库连接正常
      </div>
    </div>
  )
}
