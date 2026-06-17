import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { account, password } = await req.json()

  if (!account || !password) {
    return NextResponse.json({ error: '请填写账号和密码' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: account } })

  if (!user || !user.password) {
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
  }

  return NextResponse.json({ success: true, name: user.name ?? user.email })
}
