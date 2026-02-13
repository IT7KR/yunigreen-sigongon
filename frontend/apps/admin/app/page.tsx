"use client";

import { motion } from "framer-motion";
import { ArrowRight, Brain, FileText, Users, Receipt, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@sigongon/ui";
import { PLANS } from "./signup/types";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-primary-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-mark.png"
                alt="시공ON"
                width={36}
                height={36}
                className="object-contain"
              />
              <span className="text-xl font-bold tracking-tight text-white">
                시공ON
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-white hover:bg-white/10" asChild><Link href="/login">
                  로그인
                </Link></Button>
              <Button asChild><Link href="/signup">무료 체험</Link></Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pb-32 pt-32">
        {/* Geometric background elements */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-brand-point-500 blur-3xl" />
          <div className="absolute -left-40 top-60 h-[32rem] w-[32rem] rounded-full bg-blue-500 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center text-center"
          >
            <motion.div variants={staggerItem}>
              <div className="mb-6 inline-block rounded-full border border-brand-point-500/20 bg-brand-point-500/10 px-4 py-2 text-sm font-medium text-brand-point-400 backdrop-blur-sm">
                방수/누수 전문 시공 관리 SaaS
              </div>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="mb-6 max-w-4xl text-6xl font-bold leading-tight tracking-tight text-white md:text-7xl lg:text-8xl"
            >
              AI가 진단하고,
              <br />
              <span className="bg-gradient-to-r from-brand-point-400 to-blue-400 bg-clip-text text-transparent">
                시스템이 관리합니다
              </span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="mb-12 max-w-2xl text-xl text-slate-400 md:text-2xl"
            >
              현장 사진 한 장으로 시작하는 스마트 시공 관리.
              <br />
              진단부터 준공까지, 모든 과정을 자동화하세요.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <Button size="lg" className="group gap-3 text-lg" asChild><Link href="/signup">
                  무료 체험 시작하기
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link></Button>
              <Button
                  size="lg"
                  variant="secondary"
                  className="border-white/20 bg-white/5 text-lg text-white hover:bg-white/10"
                 asChild><Link href="/login">
                  이미 계정이 있으신가요?
                </Link></Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              variants={staggerItem}
              className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-point-500" />
                <span>신용카드 등록 불필요</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-point-500" />
                <span>1개월 무료 체험</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-point-500" />
                <span>언제든 해지 가능</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="mb-20 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
              하나의 플랫폼으로 모든 것을
            </h2>
            <p className="text-xl text-slate-400">
              시공 관리의 모든 단계를 하나로 통합했습니다
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                icon: Brain,
                title: "AI 기술진단",
                description: "현장 사진으로 누수 원인 분석",
                gradient: "from-purple-500/20 to-pink-500/20",
                iconColor: "text-purple-400",
              },
              {
                icon: FileText,
                title: "견적 자동화",
                description: "AI가 추천하는 자재와 단가 매칭",
                gradient: "from-blue-500/20 to-cyan-500/20",
                iconColor: "text-blue-400",
              },
              {
                icon: Users,
                title: "일용직 관리",
                description: "근로계약부터 지급명세서까지",
                gradient: "from-green-500/20 to-emerald-500/20",
                iconColor: "text-green-400",
              },
              {
                icon: Receipt,
                title: "문서 생성",
                description: "준공사진첩, 세금계산서까지",
                gradient: "from-orange-500/20 to-amber-500/20",
                iconColor: "text-orange-400",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
                <div className="relative">
                  <feature.icon className={`mb-6 h-12 w-12 ${feature.iconColor}`} />
                  <h3 className="mb-3 text-2xl font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="mb-20 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
              투명하고 합리적인 요금제
            </h2>
            <p className="text-xl text-slate-400">
              규모에 맞는 플랜을 선택하세요
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid gap-8 md:grid-cols-3"
          >
            {PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                variants={staggerItem}
                className={`relative overflow-hidden rounded-2xl border p-8 ${
                  plan.id === "pro"
                    ? "border-brand-point-500 bg-gradient-to-b from-brand-point-500/10 to-transparent"
                    : "border-white/10 bg-white/5"
                } backdrop-blur-sm`}
              >
                {plan.id === "pro" && (
                  <div className="absolute right-4 top-4 rounded-full bg-brand-point-500 px-3 py-1 text-xs font-medium text-white">
                    추천
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="mb-2 text-2xl font-bold text-white">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">
                      {plan.id === "trial" ? "무료" : `₩${plan.price.toLocaleString()}`}
                    </span>
                    {plan.id !== "trial" && (
                      <span className="text-slate-400">/ 년</span>
                    )}
                  </div>
                </div>

                <ul className="mb-8 space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-brand-point-500" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                    fullWidth
                    size="lg"
                    variant={plan.id === "pro" ? "primary" : "secondary"}
                    className={
                      plan.id !== "pro"
                        ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
                        : ""
                    }
                   asChild><Link href="/signup">
                    {plan.id === "trial" ? "체험 시작하기" : "선택하기"}
                  </Link></Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-point-500/20 to-blue-500/20 p-12 text-center backdrop-blur-sm md:p-16"
          >
            <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
              지금 바로 시작하세요
            </h2>
            <p className="mb-10 text-xl text-slate-300">
              1개월 무료 체험으로 시공ON의 모든 기능을 경험해보세요
            </p>
            <Button size="lg" className="text-lg" asChild><Link href="/signup">
                무료 체험 시작하기
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link></Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-mark.png"
                alt="시공ON"
                width={32}
                height={32}
                className="object-contain"
              />
              <span className="text-lg font-bold text-white">시공ON</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-400">
              <Link href="/terms" className="hover:text-white">
                이용약관
              </Link>
              <Link href="/privacy" className="hover:text-white">
                개인정보처리방침
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-sm text-slate-500">
            <p className="mb-2">© 2026 (주)유니그린. All rights reserved.</p>
            <p className="text-xs">
              AI 기반 방수/누수 시공 관리 SaaS - 시공ON
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
